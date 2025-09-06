// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IENS {
    function resolver(bytes32 node) external view returns (address);

    function owner(bytes32 node) external view returns (address);

    function setSubnodeOwner(
        bytes32 node,
        bytes32 label,
        address owner
    ) external returns (bytes32);
}

interface IENSResolver {
    function setText(
        bytes32 node,
        string calldata key,
        string calldata value
    ) external;

    function text(
        bytes32 node,
        string calldata key
    ) external view returns (string memory);
}

contract ProofOfMe {
    // ENS registry on mainnet
    IENS public constant ENS_REGISTRY =
        IENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);

    // ProofOfMe text record key
    string public constant PROOFOFME_KEY = "proofofme:registry";

    // Parent domain for subdomains (e.g., durin.eth)
    bytes32 public immutable PARENT_NODE;
    string public PARENT_DOMAIN;
    address public owner;

    // DID Registry
    mapping(bytes32 => address) public ethOwnerOf; // DID hash => Ethereum address
    mapping(bytes32 => bool) public isRegistered; // DID hash => registered status

    // Credential types mapped by subdomain
    struct Credential {
        address issuer;
        string description;
        string subdomain; // The subdomain for this credential type
        bool exists;
    }
    mapping(string => Credential) public credentials; // credentialType => Credential
    mapping(string => string) public subdomainToCredentialType; // subdomain => credentialType

    // Claims: DID hash => credential type => latest CID
    mapping(bytes32 => mapping(string => string)) public latestClaim;

    // Events
    event DIDRegistered(
        bytes32 indexed didHash,
        string did,
        address indexed ethOwner
    );
    event ClaimIssued(
        bytes32 indexed didHash,
        string did,
        string cid,
        string credentialType,
        address indexed submitter
    );
    event CredentialTypeCreated(
        string indexed credentialType,
        string subdomain,
        address indexed issuer,
        string description
    );
    event SubdomainCreated(
        bytes32 indexed node,
        string subdomain,
        address indexed issuer
    );

    // Errors
    error Unauthorized();
    error EmptyCID();
    error EmptyDID();
    error EmptyCredentialType();
    error EmptySubdomain();
    error DIDNotRegistered();
    error DIDAlreadyRegistered();
    error CredentialTypeNotExists();
    error CredentialTypeAlreadyExists();
    error SubdomainAlreadyExists();
    error ResolverNotFound(bytes32 node);

    constructor(bytes32 _parentNode, string memory _parentDomain) {
        PARENT_NODE = _parentNode;
        PARENT_DOMAIN = _parentDomain;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    /// @dev Helper: compute DID hash
    function didHash(string calldata did) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(did));
    }

    /// @notice Create a credential type with subdomain (only issuers)
    function createCredentialWithSubdomain(
        string calldata credentialType,
        string calldata subdomain,
        string calldata description
    ) external {
        if (bytes(credentialType).length == 0) revert EmptyCredentialType();
        if (bytes(subdomain).length == 0) revert EmptySubdomain();
        if (credentials[credentialType].exists)
            revert CredentialTypeAlreadyExists();
        if (bytes(subdomainToCredentialType[subdomain]).length > 0)
            revert SubdomainAlreadyExists();

        // Create ENS subdomain
        bytes32 label = keccak256(bytes(subdomain));
        bytes32 subdomainNode = keccak256(abi.encodePacked(PARENT_NODE, label));

        // Check if subdomain already exists in ENS
        if (ENS_REGISTRY.owner(subdomainNode) != address(0)) {
            revert SubdomainAlreadyExists();
        }

        // Create the subdomain and assign it to the issuer
        ENS_REGISTRY.setSubnodeOwner(PARENT_NODE, label, msg.sender);

        // Store credential type
        credentials[credentialType] = Credential({
            issuer: msg.sender,
            description: description,
            subdomain: subdomain,
            exists: true
        });

        subdomainToCredentialType[subdomain] = credentialType;

        emit SubdomainCreated(subdomainNode, subdomain, msg.sender);
        emit CredentialTypeCreated(
            credentialType,
            subdomain,
            msg.sender,
            description
        );
    }

    /// @notice Register a DID mapping to an Ethereum address
    function registerDID(
        string calldata did,
        address expectedEthOwner,
        bytes calldata sig
    ) external {
        if (bytes(did).length == 0) revert EmptyDID();

        bytes32 d = didHash(did);
        if (isRegistered[d]) revert DIDAlreadyRegistered();

        // Verify signature: keccak256(abi.encodePacked("Register", did, address(this)))
        bytes32 message = keccak256(
            abi.encodePacked("Register", did, address(this))
        );
        address signer = recoverEthSignedMessage(message, sig);
        if (signer != expectedEthOwner) revert Unauthorized();

        // Register
        ethOwnerOf[d] = expectedEthOwner;
        isRegistered[d] = true;

        emit DIDRegistered(d, did, expectedEthOwner);
    }

    /// @notice Issue a claim for a DID (only credential issuer can do this)
    function issueClaim(
        string calldata did,
        string calldata cid,
        string calldata credentialType,
        bytes calldata sig
    ) external {
        if (bytes(did).length == 0) revert EmptyDID();
        if (bytes(cid).length == 0) revert EmptyCID();
        if (bytes(credentialType).length == 0) revert EmptyCredentialType();

        bytes32 d = didHash(did);
        address didOwner = ethOwnerOf[d];
        if (didOwner == address(0) || !isRegistered[d])
            revert DIDNotRegistered();

        Credential memory cred = credentials[credentialType];
        if (!cred.exists) revert CredentialTypeNotExists();
        if (msg.sender != cred.issuer) revert Unauthorized(); // Only issuer can issue claims

        // Verify signature from DID owner
        bytes32 message = keccak256(
            abi.encodePacked(
                "IssueClaim",
                did,
                cid,
                credentialType,
                address(this)
            )
        );
        address signer = recoverEthSignedMessage(message, sig);
        if (signer != didOwner) revert Unauthorized();

        // Store the claim
        latestClaim[d][credentialType] = cid;

        emit ClaimIssued(d, did, cid, credentialType, msg.sender);
    }

    /// @notice Get claim for a DID and credential type
    function getClaim(
        string calldata did,
        string calldata credentialType
    ) external view returns (string memory) {
        return latestClaim[didHash(did)][credentialType];
    }

    /// @notice Check if credential type exists
    function credentialExists(
        string calldata credentialType
    ) external view returns (bool) {
        return credentials[credentialType].exists;
    }

    /// @notice Check if DID is registered
    function isDIDRegistered(string calldata did) external view returns (bool) {
        return isRegistered[didHash(did)];
    }

    /// @notice Get credential type by subdomain
    function getCredentialTypeBySubdomain(
        string calldata subdomain
    ) external view returns (string memory) {
        return subdomainToCredentialType[subdomain];
    }

    /// @notice Update contract owner
    function updateOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // ---------- Signature verification helpers ----------
    function recoverEthSignedMessage(
        bytes32 hash,
        bytes memory sig
    ) internal pure returns (address) {
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);
        return ecrecover(ethHash, v, r, s);
    }

    function splitSignature(
        bytes memory sig
    ) internal pure returns (uint8, bytes32, bytes32) {
        require(sig.length == 65, "invalid sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        return (v, r, s);
    }
}
