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
        togglePause(): Promise<void>;
        stop(): Promise<void>;
        quit(): Promise<void>;
        seek(seconds: number): Promise<void>;
        volume(level: number): Promise<void>;
        adjustVolume(delta: number): Promise<void>;
        on(event: string, callback: any): void;
        getProperty(property: string): Promise<any>;
        observeProperty(property: string): void;
    }

    export = NodeMpv;
}
