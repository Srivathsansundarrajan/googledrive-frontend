import { io, Socket } from "socket.io-client";

const URL = "http://localhost:5000";

class SocketService {
    private socket: Socket;

    constructor() {
        this.socket = io(URL, {
            autoConnect: false,
            withCredentials: true
        });
    }

    connect() {
        if (!this.socket.connected) {
            this.socket.connect();
        }
    }

    disconnect() {
        if (this.socket.connected) {
            this.socket.disconnect();
        }
    }

    register(userId: string) {
        this.socket.emit("register", userId);
    }

    on(event: string, callback: (data: any) => void) {
        this.socket.on(event, callback);
    }

    off(event: string) {
        this.socket.off(event);
    }
}

export default new SocketService();
