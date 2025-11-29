declare module 'node-mpv' {
    interface MpvOptions {
        audio_only?: boolean;
        auto_restart?: boolean;
        binary?: string;
        debug?: boolean;
        ipcCommand?: string;
        socket?: string;
        time_update?: number;
        verbose?: boolean;
    }

    class NodeMpv {
        constructor(options?: MpvOptions, mpvArgs?: string[]);
        load(url: string, mode?: string): Promise<void>;
        start(): Promise<void>;
        play(): Promise<void>;
        pause(): Promise<void>;
        stop(): Promise<void>;
        quit(): Promise<void>;
        // Add other methods as needed
    }

    export = NodeMpv;
}
