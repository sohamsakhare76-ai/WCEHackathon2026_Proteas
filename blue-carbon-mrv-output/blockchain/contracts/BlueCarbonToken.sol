// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║   Blue Carbon MRV — Carbon Credit Token (BCT)       ║
 * ║   Each token = 1 tonne CO₂ stored in blue carbon    ║
 * ║   National Centre for Coastal Research (NCCR)       ║
 * ╚══════════════════════════════════════════════════════╝
 */

contract BlueCarbonToken {

    // ─── TYPES ───────────────────────────────────────────────────

    enum EcosystemType { MANGROVE, SEAGRASS, SALT_MARSH }
    enum ProjectStatus  { PENDING, VERIFIED, REJECTED, MINTED }

    struct Project {
        uint256       id;
        address       owner;
        string        name;
        string        location;
        int256        latitude;      // × 1e6
        int256        longitude;     // × 1e6
        uint256       areaHectares;
        EcosystemType ecosystem;
        uint256       growthYears;
        uint256       carbonTonnes;
        string        ipfsImageHash;
        ProjectStatus status;
        uint256       creditsIssued;
        uint256       registeredAt;
        uint256       verifiedAt;
    }

    // ─── STATE ───────────────────────────────────────────────────

    address public admin;
    uint256 private _nextProjectId = 1;
    uint256 private _totalSupply;

    mapping(uint256 => Project) public projects;
    mapping(address => bool)    public isVerifier;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ERC-20 metadata
    string  public constant name     = "Blue Carbon Token";
    string  public constant symbol   = "BCT";
    uint8   public constant decimals = 0; // 1 token = 1 tonne CO₂, no fractions

    // ─── EVENTS ──────────────────────────────────────────────────

    event ProjectRegistered(uint256 indexed projectId, address indexed owner, string name);
    event ProjectVerified  (uint256 indexed projectId, address indexed verifier);
    event ProjectRejected  (uint256 indexed projectId, address indexed verifier, string reason);
    event CreditsMinted    (uint256 indexed projectId, address indexed to, uint256 amount);
    event Transfer         (address indexed from, address indexed to, uint256 value);
    event Approval         (address indexed owner, address indexed spender, uint256 value);
    event VerifierAdded    (address indexed verifier);
    event VerifierRemoved  (address indexed verifier);

    // ─── MODIFIERS ───────────────────────────────────────────────

    modifier onlyAdmin()    { require(msg.sender == admin,       "Only NCCR admin"); _; }
    modifier onlyVerifier() { require(isVerifier[msg.sender],    "Only verifier");   _; }
    modifier projectExists(uint256 pid) {
        require(pid > 0 && pid < _nextProjectId, "Project not found");
        _;
    }

    // ─── CONSTRUCTOR ─────────────────────────────────────────────

    constructor() {
        admin = msg.sender;
        isVerifier[msg.sender] = true;
    }

    // ─── ADMIN ───────────────────────────────────────────────────

    function addVerifier(address _verifier) external onlyAdmin {
        require(_verifier != address(0), "Zero address");
        isVerifier[_verifier] = true;
        emit VerifierAdded(_verifier);
    }

    function removeVerifier(address _verifier) external onlyAdmin {
        isVerifier[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Zero address");
        admin = _newAdmin;
    }

    // ─── PROJECT LIFECYCLE ────────────────────────────────────────

    function registerProject(
        string  memory _name,
        string  memory _location,
        int256         _latitude,
        int256         _longitude,
        uint256        _areaHectares,
        EcosystemType  _ecosystem,
        uint256        _growthYears,
        uint256        _carbonTonnes,
        string  memory _ipfsImageHash
    ) external returns (uint256 projectId) {
        require(bytes(_name).length > 0, "Name required");
        require(_areaHectares > 0,       "Area must be > 0");
        require(_carbonTonnes > 0,       "Carbon estimate required");

        projectId = _nextProjectId++;
        projects[projectId] = Project({
            id:            projectId,
            owner:         msg.sender,
            name:          _name,
            location:      _location,
            latitude:      _latitude,
            longitude:     _longitude,
            areaHectares:  _areaHectares,
            ecosystem:     _ecosystem,
            growthYears:   _growthYears,
            carbonTonnes:  _carbonTonnes,
            ipfsImageHash: _ipfsImageHash,
            status:        ProjectStatus.PENDING,
            creditsIssued: 0,
            registeredAt:  block.timestamp,
            verifiedAt:    0
        });

        emit ProjectRegistered(projectId, msg.sender, _name);
    }

    function verifyProject(uint256 _projectId)
        external onlyVerifier projectExists(_projectId)
    {
        Project storage p = projects[_projectId];
        require(p.status == ProjectStatus.PENDING, "Not in PENDING state");
        p.status     = ProjectStatus.VERIFIED;
        p.verifiedAt = block.timestamp;
        emit ProjectVerified(_projectId, msg.sender);
    }

    function rejectProject(uint256 _projectId, string calldata _reason)
        external onlyVerifier projectExists(_projectId)
    {
        Project storage p = projects[_projectId];
        require(p.status == ProjectStatus.PENDING, "Not in PENDING state");
        p.status = ProjectStatus.REJECTED;
        emit ProjectRejected(_projectId, msg.sender, _reason);
    }

    function mintCarbonCredits(uint256 _projectId)
        external onlyVerifier projectExists(_projectId)
    {
        Project storage p = projects[_projectId];
        require(p.status == ProjectStatus.VERIFIED, "Project not verified");
        require(p.carbonTonnes > 0, "No credits to mint");

        p.status        = ProjectStatus.MINTED;
        p.creditsIssued = p.carbonTonnes;

        _mint(p.owner, p.carbonTonnes);
        emit CreditsMinted(_projectId, p.owner, p.carbonTonnes);
    }

    // ─── ERC-20 ──────────────────────────────────────────────────

    function transfer(address _to, uint256 _amount) external returns (bool) {
        _transfer(msg.sender, _to, _amount);
        return true;
    }

    function approve(address _spender, uint256 _amount) external returns (bool) {
        allowance[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(allowance[_from][msg.sender] >= _amount, "Allowance exceeded");
        allowance[_from][msg.sender] -= _amount;
        _transfer(_from, _to, _amount);
        return true;
    }

    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function totalProjects() external view returns (uint256) { return _nextProjectId - 1; }
    function getProject(uint256 pid) external view projectExists(pid) returns (Project memory) {
        return projects[pid];
    }

    // ─── INTERNAL ────────────────────────────────────────────────

    function _mint(address _to, uint256 _amount) internal {
        _totalSupply   += _amount;
        balanceOf[_to] += _amount;
        emit Transfer(address(0), _to, _amount);
    }

    function _transfer(address _from, address _to, uint256 _amount) internal {
        require(_to != address(0),           "Transfer to zero address");
        require(balanceOf[_from] >= _amount, "Insufficient balance");
        balanceOf[_from] -= _amount;
        balanceOf[_to]   += _amount;
        emit Transfer(_from, _to, _amount);
    }
}
