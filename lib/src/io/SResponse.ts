import { Route } from "../router/Route";
import { StatusCodes } from "./StatusCode";
import { InternalRoute } from "../router/InternalRoute";
import { ConsoleLogger } from "../logging/ConsoleLogger";

export type SocketIOAck = (...args: any[]) => void;

export class SResponse<T = any> {
	protected ack?: SocketIOAck;
	protected data?: T;
	protected route: InternalRoute<Route>;
	protected socket: SocketIO.Socket;
	protected server: SocketIO.Server;
	protected statusCode: number;
	protected emitEventName: string;
	protected payloadMessage: string;

	constructor(
		socket: SocketIO.Socket,
		route: InternalRoute<Route>,
		server: SocketIO.Server,
		ack?: SocketIOAck
	) {
		this.socket = socket;
		this.server = server;

		this.ack = ack;
		this.payloadMessage = "";
		this.statusCode = 200;
		this.route = route;
	}

	// -- Fluent properties.

	public eventName(eventName: string) {
		this.emitEventName = eventName;
		return this;
	}

	public status(code: number) {
		this.statusCode = code;
		return this;
	}

	public getStatus() {
		return this.statusCode;
	}

	public withData(data: T) {
		this.data = data;
		return this;
	}

	public getData() {
		return this.data;
	}

	public message(comment: string) {
		this.payloadMessage = comment;
		return this;
	}

	public getMessage() {
		return this.payloadMessage;
	}

	public error(error: Error) {
		if (this.getStatus() < 499) {
			this.status(StatusCodes.InternalServerError);
		}

		this.message(error.message).toSender();
	}

	// -- Util

	public hasAck() {
		return !!this.ack;
	}

	// -- Sender functions

	public invokeAck() {
		if (this.ack) {
			this.ack(this.getData());
		} else {
			// TODO: Add some handling here
		}
	}

	public toSender() {
		this.socket.emit(this.getEventRoute(), this.formatPayload());
	}

	public toAllExceptSender() {
		this.socket.broadcast.emit(this.getEventRoute(), this.formatPayload());
	}

	public toAllInRoomExceptSender(roomName: string) {
		this.socket.to(roomName).emit(this.getEventRoute(), this.formatPayload());
	}

	public toAllInRoom(roomName: string) {
		this.server.in(roomName).emit(this.getEventRoute(), this.formatPayload());
	}

	public toAllInNamespace(namespaceName: string = "/") {
		this.server.of(namespaceName).emit(this.getEventRoute(), this.formatPayload());
	}

	public toIndividualSocket(socketID: string) {
		this.socket.to(socketID).emit(this.getEventRoute(), this.formatPayload());
	}

	// -- Misc Getters.

	public getSocket(): SocketIO.Socket {
		return this.socket;
	}

	// -- Helpers

	protected getEventRoute() {
		if (!this.emitEventName) {
			return this.route.config.path;
		} else {
			return this.emitEventName;
		}
	}

	protected formatPayload() {
		return {
			message: this.getMessage(),
			status: this.getStatus(),
			payload: this.getData()
		};
	}
}
