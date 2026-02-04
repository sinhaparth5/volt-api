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
	export class HTTPRequest {
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: string;
	    timeout: number;
	
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

}

