export namespace app {
	
	export class AppInfo {
	    version: string;
	    buildTime: string;
	
	    static createFrom(source: any = {}) {
	        return new AppInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.buildTime = source["buildTime"];
	    }
	}
	export class Collection {
	    id: string;
	    name: string;
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new Collection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class Environment {
	    id: string;
	    name: string;
	    isActive: boolean;
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new Environment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.isActive = source["isActive"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class EnvironmentVariable {
	    id: string;
	    environmentId: string;
	    key: string;
	    value: string;
	    enabled: boolean;
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new EnvironmentVariable(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.environmentId = source["environmentId"];
	        this.key = source["key"];
	        this.value = source["value"];
	        this.enabled = source["enabled"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class HTTPRequest {
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: string;
	    timeout: number;
	    proxyUrl: string;
	    skipSslVerify: boolean;
	    clientCertPath: string;
	    clientKeyPath: string;
	    followRedirects: boolean;
	    maxRedirects: number;
	
	    static createFrom(source: any = {}) {
	        return new HTTPRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	        this.timeout = source["timeout"];
	        this.proxyUrl = source["proxyUrl"];
	        this.skipSslVerify = source["skipSslVerify"];
	        this.clientCertPath = source["clientCertPath"];
	        this.clientKeyPath = source["clientKeyPath"];
	        this.followRedirects = source["followRedirects"];
	        this.maxRedirects = source["maxRedirects"];
	    }
	}
	export class HTTPResponse {
	    statusCode: number;
	    statusText: string;
	    headers: Record<string, string>;
	    body: string;
	    timingMs: number;
	    contentLength: number;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new HTTPResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.statusCode = source["statusCode"];
	        this.statusText = source["statusText"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	        this.timingMs = source["timingMs"];
	        this.contentLength = source["contentLength"];
	        this.error = source["error"];
	    }
	}
	export class HistoryItem {
	    id: string;
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: string;
	    statusCode: number;
	    timingMs: number;
	    createdAt: number;
	
	    static createFrom(source: any = {}) {
	        return new HistoryItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	        this.statusCode = source["statusCode"];
	        this.timingMs = source["timingMs"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class SaveRequestInput {
	    name: string;
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: string;
	
	    static createFrom(source: any = {}) {
	        return new SaveRequestInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	    }
	}
	export class SavedRequest {
	    id: string;
	    collectionId: string;
	    name: string;
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: string;
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new SavedRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.collectionId = source["collectionId"];
	        this.name = source["name"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}

}

