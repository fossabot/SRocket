import { Route, RouteReturn, ControllerMetaRoute } from "../Route";
import { Newable } from "../../structures/Newable";
import { rightPad } from "../../utility/pads";
import { Metadata } from "../../utility/Metadata";
import { ConsoleLogger } from "../..";
import { ControllerConfig, UserControllerConfig } from "../types/ControllerConfig";
import { SOCKET_ROUTE_METADATA_KEY } from "../../decorator/SocketRoute";
import { RouteConfig, UserRouteConfig } from "../types/RouteConfig";
import {
	InternalRoute,
	FunctionalInternalRoute,
	ClassInternalRoute,
	ObjectInternalRoute,
	ControllerMetaInternalRoute
} from "../../router/InternalRoute";
import { SOCKET_CONTROLLER_METADATA_KEY } from "../../decorator/SocketController";

export enum RouteType {
	ClassBased = "class",
	ObjectBased = "object",
	FunctionBased = "functional"
}

export class ControllerMetadata {
	public messageRoutes: RouteMetadata[];
	public connectHandlers: ControllerMetaInternalRoute[];
	public disconnectHandlers: ControllerMetaInternalRoute[];

	public config: ControllerConfig;

	public namespace: string;

	constructor() {
		this.namespace = "/";

		this.messageRoutes = [];
		this.connectHandlers = [];
		this.disconnectHandlers = [];
	}
}

export class RouteMetadata {
	public handler: InternalRoute<Route>;
	public config: RouteConfig;

	constructor(handler: InternalRoute<Route>, config: RouteConfig) {
		this.handler = handler;
		this.config = config;
	}
}

export abstract class Controller {
	$onConnect?(socket): RouteReturn;
	$onDisconnect?(socket): RouteReturn;
}

export class RouteMetadataStore {
	public controllers: ControllerMetadata[];

	protected logger: ConsoleLogger;

	constructor() {
		this.controllers = [];
		this.logger = new ConsoleLogger("Route-Store");
	}

	public buildController(controller: Newable<Controller>) {
		this.logger.info(`Registering Controller: ${controller.name}`);

		const controllerMetadata = new ControllerMetadata();
		const instance = new controller();

		const properties = [
			...Object.getOwnPropertyNames(instance),
			...Object.getOwnPropertyNames(controller.prototype)
		];

		for (const property of properties) {
			if (RouteMetadataStore.hasValidRouteMetadata(instance, property)) {
				this.buildRoute(
					controllerMetadata,
					instance[property],
					RouteMetadataStore.buildRouteConfigFromDecorator(instance, property)
				);
			}
		}

		this.getControllerMetaRoutes(instance, controllerMetadata);
		RouteMetadataStore.buildControllerConfigFromDecorator(controller, controllerMetadata);

		this.addController(controllerMetadata);
	}

	public buildRoute(controllerMetadata: ControllerMetadata, route: Route, config: RouteConfig) {
		const routeType = RouteMetadataStore.findRouteType(route);

		this.logger.info(`\t${rightPad(routeType, 10)} : ${config.path}`);

		let internalRoute: InternalRoute<Route>;
		switch (routeType) {
			case RouteType.ClassBased:
				internalRoute = new ClassInternalRoute(route as any, config);
				break;
			case RouteType.FunctionBased:
				internalRoute = new FunctionalInternalRoute(route as any, config);
				break;
			case RouteType.ObjectBased:
				internalRoute = new ObjectInternalRoute(route as any, config);
				break;
			default:
				throw new Error("Tried to register unknown Route type!");
		}

		const routeMetadata = new RouteMetadata(internalRoute, config);
		controllerMetadata.messageRoutes.push(routeMetadata);
	}

	protected addController(metadata: ControllerMetadata) {
		this.controllers.push(metadata);
	}

	protected getControllerMetaRoutes(controller: Controller, metadata: ControllerMetadata) {
		if (controller.$onConnect) {
			this.logger.info("\tA Connect Handler!");
			metadata.connectHandlers.push(new ControllerMetaInternalRoute(controller.$onConnect));
		}

		if (controller.$onDisconnect) {
			this.logger.info("\tA Disconnect Handler!");
			metadata.disconnectHandlers.push(new ControllerMetaInternalRoute(controller.$onDisconnect));
		}
	}

	protected static buildControllerConfigFromDecorator(controller: Newable<Controller>, metadata: ControllerMetadata) {
		const userControllerConfig: UserControllerConfig = RouteMetadataStore.getControllerMetadata(controller);

		if (!userControllerConfig) return;

		metadata.config = {
			middleware: userControllerConfig.middleware || []
		};
	}

	protected static buildRouteConfigFromDecorator(controller: Controller, property: string): RouteConfig {
		const userConfig: UserRouteConfig = RouteMetadataStore.getRouteMetadata(controller, property);

		return {
			path: userConfig.path || property,
			middleware: userConfig.middleware || []
		};
	}

	protected static getControllerMetadata(target: Newable<Controller>) {
		const metadata = Metadata.getClassDecorator(SOCKET_CONTROLLER_METADATA_KEY, target);
		return metadata;
	}

	protected static getRouteMetadata(target: any, property?: string) {
		const metadata = property
			? Metadata.getPropertyDecorator(SOCKET_ROUTE_METADATA_KEY, target, property)
			: Metadata.getClassDecorator(SOCKET_ROUTE_METADATA_KEY, target);

		return metadata;
	}

	protected static hasValidRouteMetadata(target: any, property?: string) {
		const metadata = RouteMetadataStore.getRouteMetadata(target, property);
		return metadata !== null && metadata !== undefined;
	}

	protected static findRouteType(target: any, property?: string): RouteType {
		if (property) target = target[property];

		if (typeof target === "object") {
			return RouteType.ObjectBased;
		} else if (typeof target === "function") {
			if (target.prototype && typeof target.prototype.on === "function") {
				return RouteType.ClassBased;
			} else {
				return RouteType.FunctionBased;
			}
		} else {
			throw new Error(
				"Tried to register something as a Route that is nor a object nor a function or a class/object with a 'on' function!"
			);
		}
	}
}