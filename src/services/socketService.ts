import { io, Socket } from "socket.io-client";

const URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

class SocketService {
    private socket: Socket;

    constructor() {
        this.socket = io(URL, {
            autoConnect: false,
            withCredentials: true,
            transports: ["websocket", "polling"], // Try websocket first
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on("connect", () => {
            console.log("Socket connected:", this.socket.id);
        });

        this.socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
        });

        this.socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
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

    joinDrive(driveId: string) {
        this.socket.emit("join_drive", driveId);
    }

    leaveDrive(driveId: string) {
        this.socket.emit("leave_drive", driveId);
    }
}

export default new SocketService();
