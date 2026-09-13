// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GiftyRegistrar, IPermissionedResolver, IUserRegistry} from "../src/GiftyRegistrar.sol";

contract MockRegistry {
    uint256 public nextId = 1;
    mapping(string => address) public owners;
    mapping(string => uint256) public ids;

    function findOwner(string calldata label) external view returns (address) {
        return owners[label];
    }

    function findTokenId(string calldata label) external view returns (uint256) {
        return ids[label];
    }

    function seed(string calldata label, address owner, uint256 tokenId) external {
        owners[label] = owner;
        ids[label] = tokenId;
    }

    function register(string calldata label, address owner, address, address, uint256, uint64)
        external
        returns (uint256 tokenId)
    {
        tokenId = nextId++;
        owners[label] = owner;
        ids[label] = tokenId;
    }
}

contract MockResolver {
    mapping(bytes32 => address) public addrOf;

    function setAddr(bytes32 node, address addr) external {
        addrOf[node] = addr;
    }
}

contract GiftyRegistrarTest is Test {
    MockRegistry internal registry;
    MockResolver internal resolver;
    GiftyRegistrar internal registrar;
    bytes32 internal parentNode;

    address internal constant USER = address(uint160(0xA11CE));

    function setUp() public {
        registry = new MockRegistry();
        resolver = new MockResolver();
        parentNode = keccak256("gifty.eth");
        registrar = new GiftyRegistrar(
            IUserRegistry(address(registry)), IPermissionedResolver(address(resolver)), parentNode
        );
    }

    function test_registerStoresLabelAndSetsAddr() public {
        vm.prank(USER);
        uint256 tokenId = registrar.register("beeinger", USER);
        assertEq(tokenId, 1);
        assertEq(registrar.labelOf(USER), "beeinger");
        assertFalse(registrar.isAvailable("beeinger"));
        bytes32 node = keccak256(abi.encodePacked(parentNode, keccak256(bytes("beeinger"))));
        assertEq(resolver.addrOf(node), USER);
    }

    function test_secondNameForOwnerReverts() public {
        vm.startPrank(USER);
        registrar.register("one", USER);
        vm.expectRevert(GiftyRegistrar.AlreadyNamed.selector);
        registrar.register("two", USER);
        vm.stopPrank();
    }

    function test_takenLabelReverts() public {
        vm.prank(USER);
        registrar.register("taken", USER);
        address other = address(uint160(0xB0B));
        vm.prank(other);
        vm.expectRevert(GiftyRegistrar.LabelTaken.selector);
        registrar.register("taken", other);
    }

    function test_registryNameUnavailable() public {
        registry.seed("beeinger", USER, 99);
        assertFalse(registrar.isAvailable("beeinger"));
        address other = address(uint160(0xB0B));
        vm.prank(other);
        vm.expectRevert(GiftyRegistrar.LabelTaken.selector);
        registrar.register("beeinger", other);
    }

    function test_adoptsExistingRegistryName() public {
        registry.seed("beeinger", USER, 99);
        uint256 tokenId = registrar.register("beeinger", USER);
        assertEq(tokenId, 99);
        assertEq(registrar.labelOf(USER), "beeinger");
        assertEq(registry.nextId(), 1);
    }

    function test_operatorCanRegisterForUser() public {
        uint256 tokenId = registrar.register("sponsored", USER);
        assertEq(tokenId, 1);
        assertEq(registrar.labelOf(USER), "sponsored");
        assertEq(registrar.operator(), address(this));
    }

    function test_nonOperatorCannotRegisterForOther() public {
        address other = address(uint160(0xB0B));
        vm.prank(other);
        vm.expectRevert(GiftyRegistrar.NotAuthorized.selector);
        registrar.register("sneaky", USER);
    }

    function test_setOperatorLetsNewOperatorRegister() public {
        address nextOp = address(uint160(0x0B));
        registrar.setOperator(nextOp);
        vm.prank(nextOp);
        registrar.register("sponsored", USER);
        assertEq(registrar.labelOf(USER), "sponsored");
        assertEq(registrar.operator(), nextOp);
        assertEq(registrar.owner(), address(this));
    }
}
