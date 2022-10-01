import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  OrderBook,
  OrderBook__ordersResult,
  OrderCancelled,
  OrderExecuted,
  OrderPlaced
} from "../generated/OrderBook/OrderBook";
import {
  LimitOrder,
  MarketOrder,
  Order,
  OrderBookRow
} from "../generated/schema";
import { getModuleType, getOrNull } from "./helpers";

enum Side {
  LONG,
  SHORT
}

export function handleOrderPlaced(orderPlaced: OrderPlaced): void {
  let entity = new Order(orderPlaced.params.key.toHex());
  let contract = OrderBook.bind(orderPlaced.address);
  let order = getOrNull<OrderBook__ordersResult>(
    contract.try_orders(orderPlaced.params.key)
  );
  if (!order) return;

  let moduleType = getModuleType(orderPlaced.address, order.getModule());

  entity.module = order.getModule();
  entity.owner = order.getOwner();
  entity.market = order.getIndexToken().toHex();
  entity.collateralToken = order.getCollateralToken();
  entity.sizeChanged = order.getSizeChanged();
  entity.collateralAmount = order.getCollateralAmount();
  entity.executionFee = order.getExecutionFee();
  entity.submissionBlock = order.getSubmissionBlock();
  entity.submissionTimestamp = order.getSubmissionTimestamp();
  entity.executionTimestamp = BigInt.fromI32(0);
  entity.side = order.getSide();
  entity.orderType = order.getOrderType() == 0 ? "INCREASE" : "DECREASE";
  entity.status = "PLACED";

  let data = order.getData();
  if (!data) {
    return;
  }
  entity.data = data;

  let orderRow = new OrderBookRow(entity.id);
  orderRow.direction =
    entity.side == Side.LONG && entity.orderType == "INCREASE" ? "BID" : "ASK";
  orderRow.createdAt = entity.submissionTimestamp;
  orderRow.status = "OPEN";
  orderRow.market = entity.market;
  orderRow.module = moduleType;

  // parse order data
  if (moduleType == "limit") {
    let limitOrder = new LimitOrder(entity.id + "-limit");
    let params = ethereum.decode("(uint256,bool)", data)!.toTuple();
    limitOrder.limitPrice = params[0].toBigInt();
    limitOrder.triggerAboveThreshold = params[1].toBoolean();
    limitOrder.order = entity.id;
    orderRow.triggerPrice = limitOrder.limitPrice;
    limitOrder.save();
  } else if (moduleType == "market") {
    let marketOrder = new MarketOrder(entity.id + "-market");
    let params = ethereum.decode("(uint256)", data)!.toTuple();
    marketOrder.acceptablePrice = params[0].toBigInt();
    marketOrder.order = entity.id;
    orderRow.triggerPrice = marketOrder.acceptablePrice;
    marketOrder.save();
  }
  entity.save();
  orderRow.save();
}

export function handleOrderCancelled(orderCancelled: OrderCancelled): void {
  let key = orderCancelled.params.key.toHex();
  let entity = Order.load(key);
  if (entity) {
    entity.status = "CANCELLED";
    entity.save();
  }
  let row = OrderBookRow.load(key);
  if (row) {
    row.status = "CANCELLED";
  }
}

export function handleOrderExecuted(orderExecuted: OrderExecuted): void {
  let key = orderExecuted.params.key.toHex();
  let entity = Order.load(key);
  if (entity) {
    entity.status = "EXECUTED";
    entity.executionTimestamp = orderExecuted.block.timestamp;
    entity.save();
  }
  let row = OrderBookRow.load(key);
  if (row) {
    row.status = "FILLED";
  }
}
