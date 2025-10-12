export function connectWS({ onMessage, onOpen, onClose }) {
  const ws = new WebSocket(process.env.REACT_APP_WS_URL);
  ws.onopen = () => onOpen && onOpen();
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onMessage && onMessage(data);
    } catch {}
  };
  ws.onclose = () => onClose && onClose();
  return ws;
}
