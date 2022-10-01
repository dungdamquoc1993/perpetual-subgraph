import { Market, Position, Token, Vault } from "../generated/schema";
import { ERC20 } from "../generated/Vault/ERC20";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { EthAddress } from "./helpers";
import {
  ClosePosition,
  IncreasePosition,
  LiquidatePosition,
  TokenWhitelisted,
  UpdatePosition,
} from "../generated/Vault/Vault";
import { integer } from "@protofire/subgraph-toolkit";

function loadOrCreateVault(address: Address): Vault {
  let entity = Vault.load("1");

  if (entity != null) {
    return entity;
  }

  entity = new Vault("1");
  entity.address = address.toHex();
  return entity;
}

function loadOrCreateToken(address: Address): Token {
  let entity = Token.load(address.toHex());
  if (entity != null) {
    return entity;
  }

  entity = new Token(address.toHex());
  let token = ERC20.bind(address);
  let isETH = address.equals(EthAddress);
  entity.decimals = isETH ? 18 : token.decimals();
  entity.symbol = isETH ? "ETH" : token.symbol();
  entity.price = BigInt.fromI32(0);
  return entity;
}

function loadOrCreateMarket(indexToken: Address): Market {
  let entity = Market.load(indexToken.toHex());
  if (entity != null) {
    return entity;
  }

  entity = new Market(indexToken.toHex());
  entity.indexToken = indexToken.toHex();
  entity.vault = "1";
  return entity;
}

function loadOrCreatePosition(key: Bytes, event: ethereum.Event): Position {
  let entity = Position.load(key.toHex());
  if (entity != null) {
    return entity;
  }
  entity = new Position(key.toHex());
  entity.size = integer.ZERO;
  entity.collateralValue = integer.ZERO;
  entity.leverage = integer.ZERO;
  entity.reserveAmount = integer.ZERO;
  entity.entryPrice = integer.ZERO;
  entity.liquidatedPrice = integer.ZERO;
  entity.entryInterestRate = integer.ZERO;
  entity.createAtTimeStamp = event.block.timestamp;
  entity.status = "OPEN";
  return entity;
}

export function handleTokenWhitelisted(ev: TokenWhitelisted): void {
  let vault = loadOrCreateVault(ev.address);
  let token = loadOrCreateToken(ev.params.token);
  let market = loadOrCreateMarket(ev.params.token);
  token.save();
  market.save();
  vault.save();
}

export function handleIncreasePosition(ev: IncreasePosition): void {
  let position = loadOrCreatePosition(ev.params.key, ev);
  position.owner = ev.params.account;
  position.collateralToken = ev.params.collateralToken;
  position.market = ev.params.indexToken.toHex();
  position.side = ev.params.side;
  position.save();
}

export function handleUpdatePosition(ev: UpdatePosition): void {
  let position = loadOrCreatePosition(ev.params.key, ev);
  position.size = ev.params.size;
  position.collateralValue = ev.params.collateralValue;
  position.leverage = ev.params.collateralValue
    ? ev.params.size.div(ev.params.collateralValue)
    : integer.ZERO;
  position.reserveAmount = ev.params.reserveAmount;
  position.entryPrice = ev.params.entryPrice;
  position.entryInterestRate = ev.params.entryInterestRate;
  position.save();
}

export function handleClosePosition(ev: ClosePosition): void {
  let position = loadOrCreatePosition(ev.params.key, ev);
  position.size = ev.params.size;
  position.collateralValue = ev.params.collateralValue;
  position.leverage = ev.params.collateralValue
    ? ev.params.size.div(ev.params.collateralValue)
    : integer.ZERO;
  position.reserveAmount = ev.params.reserveAmount;
  position.entryInterestRate = ev.params.entryInterestRate;
  position.status = "CLOSED";
  position.save();
}

export function handleLiquidatePosition(ev: LiquidatePosition): void {
  let position = loadOrCreatePosition(ev.params.key, ev);
  position.size = ev.params.size;
  position.collateralValue = ev.params.collateralValue;
  position.leverage = ev.params.collateralValue
    ? ev.params.size.div(ev.params.collateralValue)
    : integer.ZERO;
  position.reserveAmount = ev.params.reserveAmount;
  position.liquidatedPrice = ev.params.indexPrice;
  position.status = "LIQUIDATED";
  position.save();
}
