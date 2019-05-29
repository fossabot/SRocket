process.env["DEBUG"] = "srocket:*";

import { SRequest, SResponse } from "../../src";
import { SocketController } from "../../src/decorator/SocketController";
import { RouteMetadata } from "../../src/router/metadata/RouteMetadata";
import { SocketRoute } from "../../src/decorator/SocketRoute";
import { ObjectRoute } from "../../src/router/Route";
import { Middleware } from "../../src/middleware/Middleware";
import { Controller } from "../../src/router/Controller";
import { SRocket } from "../../src/start/SRocket";

import {
	joi,
	Validate,
	JoiValidationMiddleware
} from "../../../addons/middleware-validation-joi/JoiValidationMiddleware";
import { SEvent } from "../../src/io/SEvent";

class LoggingMiddleware extends Middleware {
	async invoke(request: SRequest, response: SResponse, route: RouteMetadata, next: VoidFunction) {
		console.log(`LOGGER: Request to : ${route.config.path} -> ${JSON.stringify(request.data)}`);
		next();
	}
}

@SocketController()
export class UserController extends Controller {
	$onConnect(socket: SocketIO.Socket) {
		console.log("A socket connected...", socket.id);
	}

	$onDisconnect(socket: SocketIO.Socket) {
		console.log("A socket disconnected...", socket.id);
	}

	@SocketRoute({
		path: "userRegister"
	})
	objectR: ObjectRoute = {
		on() {
			console.log("Handling register...");

			throw new Error(
				"OPPSI WOOPSI, It semz lik thr was a errwa! Our codez monkeyz are working vewy hawd to fix dis!"
			);
		},
		onError() {
			console.log("No problem I got you... :)");
		}
	};

	@SocketRoute()
	@Validate(
		joi.array().items(
			joi.object().keys({
				name: joi.string()
			}),
			joi.func().required()
		)
	)
	functional(event: SEvent) {
		console.log("functional Handler!", event.request.data[0].name);
		event.response.withData(event.request.data).invokeAck();
	}
}

SRocket.fromPort(5555)
	.controllers(UserController)
	.addGlobalMiddleware([LoggingMiddleware, JoiValidationMiddleware], [])
	.listen(() => {
		console.log("Server started!");
	});
