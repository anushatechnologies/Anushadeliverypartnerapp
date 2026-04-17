type NotificationPayload = Record<string, any>;

const stringValue = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized.length ? normalized : undefined;
};

const upperValue = (value: unknown) => stringValue(value)?.toUpperCase();

const buildOrderRoute = (payload: NotificationPayload) => {
  const orderId =
    stringValue(payload.orderId) ||
    stringValue(payload.deliveryOrderId) ||
    stringValue(payload.id);
  const orderNumber =
    stringValue(payload.orderNumber) ||
    stringValue(payload.order_id) ||
    stringValue(payload.orderNo);

  const params: string[] = [];
  if (orderId) params.push(`notificationOrderId=${encodeURIComponent(orderId)}`);
  if (orderNumber) params.push(`notificationOrderNumber=${encodeURIComponent(orderNumber)}`);
  return params.length ? `/(tabs)/orders?${params.join("&")}` : "/(tabs)/orders";
};

export const canNavigateFromNotification = (payload?: NotificationPayload | null) => {
  if (!payload) return false;

  const screen = upperValue(payload.screen);
  const type = upperValue(payload.type || payload.notificationType);
  const hasOrderTarget =
    Boolean(stringValue(payload.orderId)) ||
    Boolean(stringValue(payload.deliveryOrderId)) ||
    Boolean(stringValue(payload.orderNumber));

  if (hasOrderTarget) return true;
  if (screen === "EARNINGS" || type === "PAYOUT") return true;
  if (screen === "PROFILE" || screen === "ACCOUNT" || type === "ACCOUNT") return true;
  if (screen === "NOTIFICATIONS") return true;
  return false;
};

export const navigateFromNotification = (
  router: { push: (href: string) => void },
  payload?: NotificationPayload | null,
) => {
  if (!payload) return false;

  const screen = upperValue(payload.screen);
  const type = upperValue(payload.type || payload.notificationType);
  const hasOrderTarget =
    Boolean(stringValue(payload.orderId)) ||
    Boolean(stringValue(payload.deliveryOrderId)) ||
    Boolean(stringValue(payload.orderNumber));

  if (
    hasOrderTarget ||
    screen === "ORDERDETAIL" ||
    screen === "ORDERS" ||
    type === "NEW_DELIVERY_ORDER" ||
    type === "ORDER_ASSIGNED" ||
    type === "ORDER_BROADCAST_CLOSED" ||
    type === "ORDER_UPDATE"
  ) {
    router.push(buildOrderRoute(payload));
    return true;
  }

  if (screen === "EARNINGS" || type === "PAYOUT") {
    router.push("/(tabs)/earnings");
    return true;
  }

  if (screen === "PROFILE" || screen === "ACCOUNT" || type === "ACCOUNT") {
    router.push("/(tabs)/profile");
    return true;
  }

  router.push("/notifications");
  return true;
};
