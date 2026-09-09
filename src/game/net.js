// ============================================================
//  EMBERFALL client net layer
//  Host-authoritative model:
//   - HOST runs the real game; broadcasts world snapshots
//   - CLIENT sends its inputs; renders received snapshots
// ============================================================

export class Net {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.role = null; // "host" | "client"
    this.code = null;
    this.connected = false;
    this.onMessage = () => {};
    this.onStatus = () => {};
    this.lastPing = 0;
    this._pingTimer = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (e) { reject(e); return; }
      const timeout = setTimeout(() => reject(new Error("Connection timed out")), 8000);
      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.connected = true;
        // keep-alive
        this._pingTimer = setInterval(() => {
          if (this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: "ping" }));
        }, 20000);
        resolve();
      };
      this.ws.onerror = () => { clearTimeout(timeout); reject(new Error("Cannot reach server")); };
      this.ws.onmessage = ev => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.t === "pong") { this.lastPing = Date.now(); return; }
        this.onMessage(msg);
      };
      this.ws.onclose = () => {
        this.connected = false;
        if (this._pingTimer) clearInterval(this._pingTimer);
        this.onStatus({ type: "disconnected" });
      };
    });
  }

  host() {
    this.role = "host";
    this.ws.send(JSON.stringify({ t: "host" }));
  }

  join(code, name = "Player 2") {
    this.role = "client";
    this.ws.send(JSON.stringify({ t: "join", code, name }));
  }

  sendInput(keys, aim) {
    if (this.role === "client" && this.connected && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ t: "input", keys, aim }));
    }
  }

  sendState(snapshot) {
    if (this.role === "host" && this.connected && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ t: "state", ...snapshot }));
    }
  }

  sendEvent(evt) {
    if (this.connected && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ t: "event", ...evt }));
    }
  }

  close() {
    if (this.ws) {
      try { this.ws.send(JSON.stringify({ t: "leave" })); } catch {}
      this.ws.close();
    }
    this.connected = false;
  }
}

// Default relay URL: same host as the page on :8787, or override via ?server=
export function defaultServerUrl() {
  const params = new URLSearchParams(location.search);
  if (params.get("server")) return params.get("server");
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.hostname}:8787`;
}
