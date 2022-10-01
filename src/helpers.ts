import { Address, ethereum, TypedMap } from "@graphprotocol/graph-ts";

export const EthAddress = Address.fromHexString("0x" + "e".repeat(40));

const moduleTypes: Map<string, string> = new Map();

moduleTypes.set(
  "0x60d84f26a30da10c1495baeb622093bebe65572f:0x84a993306feda24f768126e68c2a1213d2a8d95c",
  "limit"
);
moduleTypes.set(
  "0x60d84f26a30da10c1495baeb622093bebe65572f:0x573f4494190f1b6a3f518dae8057aa2715f6900d",
  "market"
);


export function getModuleType(
  orderBookAddress: Address,
  moduleAddress: Address
): string {
  const key =
    orderBookAddress.toHex().toLowerCase() +
    ":" +
    moduleAddress.toHex().toLowerCase();
  let a = moduleTypes.get(key);

  if (!a || (a != "limit" && a != "market")) {
    throw new Error("Invalid module, key: " + key + " return " + a);
  }

  return a;
}

export function getOrNull<T>(result: ethereum.CallResult<T>): T | null {
  return result.reverted ? null : result.value;
}
