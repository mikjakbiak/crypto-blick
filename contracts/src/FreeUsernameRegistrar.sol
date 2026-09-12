// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IUserRegistry {
    function register(
        string calldata label,
        address owner,
        address subregistry,
        address resolver,
        uint256 roleBitmap,
        uint64 expiry
    ) external returns (uint256 tokenId);
}

interface IPermissionedResolver {
    function setAddr(bytes32 node, address addr) external;
}

/// @notice Zero-price ENSv2 subname registrar. One username per wallet.
contract FreeUsernameRegistrar {
    uint256 public constant REGISTRATION_ROLE_BITMAP =
        (1 << 20) | ((1 << 20) << 128) | (1 << 24) | ((1 << 24) << 128) | ((1 << 28) << 128);

    uint64 public constant USERNAME_DURATION = 100 * 365 days;

    IUserRegistry public immutable registry;
    IPermissionedResolver public immutable resolver;
    bytes32 public immutable parentNode;

    mapping(address => string) public labelOf;
    mapping(bytes32 => address) public ownerOfLabelHash;

    event UsernameRegistered(string label, address indexed owner, uint256 tokenId);

    error InvalidLabel();
    error AlreadyNamed();
    error LabelTaken();
    error InvalidOwner();
    error NotOwner();

    constructor(IUserRegistry registry_, IPermissionedResolver resolver_, bytes32 parentNode_) {
        registry = registry_;
        resolver = resolver_;
        parentNode = parentNode_;
    }

    function isAvailable(string calldata label) public view returns (bool) {
        return ownerOfLabelHash[keccak256(bytes(label))] == address(0);
    }

    function register(string calldata label, address owner) external returns (uint256 tokenId) {
        if (owner == address(0)) revert InvalidOwner();
        if (owner != msg.sender) revert NotOwner();
        if (bytes(labelOf[owner]).length != 0) revert AlreadyNamed();
        if (!_validLabel(label)) revert InvalidLabel();

        bytes32 labelHash = keccak256(bytes(label));
        if (ownerOfLabelHash[labelHash] != address(0)) revert LabelTaken();

        ownerOfLabelHash[labelHash] = owner;
        labelOf[owner] = label;

        tokenId = registry.register(
            label,
            owner,
            address(0),
            address(resolver),
            REGISTRATION_ROLE_BITMAP,
            uint64(block.timestamp) + USERNAME_DURATION
        );

        bytes32 node = keccak256(abi.encodePacked(parentNode, labelHash));
        resolver.setAddr(node, owner);

        emit UsernameRegistered(label, owner, tokenId);
    }

    function _validLabel(string calldata label) internal pure returns (bool) {
        bytes memory raw = bytes(label);
        if (raw.length == 0 || raw.length > 63) return false;
        for (uint256 i; i < raw.length; i++) {
            bytes1 c = raw[i];
            bool ok = (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39) || c == 0x2d;
            if (!ok) return false;
        }
        return true;
    }
}
