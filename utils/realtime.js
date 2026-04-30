let ioInstance = null;

const initRealtime = (io) => {
  ioInstance = io;
};

const emitAdminEvent = (eventType, payload = {}) => {
  if (!ioInstance) return;

  ioInstance.to('admin').emit('admin:event', {
    type: eventType,
    timestamp: new Date().toISOString(),
    payload
  });
};

module.exports = {
  initRealtime,
  emitAdminEvent
};
