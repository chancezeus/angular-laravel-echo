declare namespace Echo {
  import * as pusher from 'pusher-js';
  import {Pusher} from 'pusher-js';
  import * as io from 'socket.io-client';

  interface EchoStatic {
    /**
     * The broadcasting connector.
     */
    connector: Echo.PusherConnector | Echo.SocketIoConnector | Echo.NullConnector;

    /**
     * The echo options.
     */
    options: Echo.Config;

    /**
     * Create a new class instance.
     *
     * @param {Echo.Config} options
     * @returns {EchoStatic}
     */
    new(options: Echo.Config): EchoStatic;

    /**
     * Register a Vue HTTP interceptor to add the X-Socket-ID header.
     */
    registerVueRequestInterceptor(): void;

    /**
     * Register an Axios HTTP interceptor to add the X-Socket-ID header.
     */
    registerAxiosRequestInterceptor(): void;

    /**
     * Register jQuery AjaxSetup to add the X-Socket-ID header.
     */
    registerjQueryAjaxSetup(): void;

    /**
     * Listen for an event on a channel instance.
     *
     * @param {string} channel
     * @param {string} event
     * @param {(event: any) => void} callback
     * @returns {Echo.Channel}
     */
    listen(channel: string, event: string, callback: (event: any) => void): Echo.Channel;

    /**
     * Get a channel instance by name.
     *
     * @param {string} channel
     * @returns {Echo.Channel}
     */
    channel(channel: string): Echo.Channel;

    /**
     * Get a private channel instance by name.
     *
     * @param {string} channel
     * @returns {Echo.Channel}
     */
    private(channel: string): Echo.PrivateChannel;

    /**
     * Get a presence channel instance by name.
     *
     * @param {string} channel
     * @returns {Echo.PresenceChannel}
     */
    join(channel: string): Echo.PresenceChannel;

    /**
     * Leave the given channel.
     *
     * @param {string} channel
     */
    leave(channel: string): void;

    /**
     * Get the Socket ID for the connection.
     *
     * @returns {string}
     */
    socketId(): string;

    /**
     * Disconnect from the Echo server.
     */
    disconnect(): void;
  }

  interface Config {
    /**
     * Authentication information for the underlying connector
     */
    auth?: {
      /**
       * Headers to be included with the request
       */
      headers?: { [key: string]: any };
    };
    /**
     * The authentication endpoint
     */
    authEndpoint?: string;
    /**
     * The broadcaster to use
     */
    broadcaster?: 'socket.io' | 'pusher' | 'null';
    /**
     * The application CSRF token
     */
    csrfToken?: string | null;
    /**
     * The namespace to use for events
     */
    namespace?: string;
  }

  interface NullConfig extends Config {
    broadcaster: 'null';
  }

  interface PusherConfig extends Config, pusher.Config {
    broadcaster?: 'pusher';

    /**
     * A pusher client instance to use
     */
    client?: Pusher;
    /**
     * The pusher host to connect to
     */
    host?: string | null;
    /**
     * The pusher auth key
     */
    key?: string | null;
  }

  interface SocketIoConfig extends Config, SocketIOClient.ConnectOpts {
    broadcaster: 'socket.io';

    /**
     * A reference to the socket.io client to use
     */
    client?: SocketIOClientStatic;

    /**
     * The url of the laravel echo server instance
     */
    host: string;
  }

  interface Connector {
    /**
     * All of the subscribed channel names.
     */
    channels: any;

    /**
     * Connector options.
     */
    options: Config;

    /**
     * Create a new class instance.
     *
     * @param {Echo.Config} options
     * @returns {Echo.Connector}
     */
    (options: Config): Connector;

    /**
     * Create a fresh connection.
     */
    connect(): void;

    /**
     * Listen for an event on a channel instance.
     *
     * @param {string} name
     * @param {string} event
     * @param {pusher.EventCallback} callback
     * @returns {Echo.PusherChannel}
     */
    listen(name: string, event: string, callback: (event: any) => void): Channel;

    /**
     * Get a channel instance by name.
     *
     * @param {string} channel
     * @returns {Echo.Channel}
     */
    channel(channel: string): Channel;

    /**
     * Get a private channel instance by name.
     *
     * @param {string} channel
     * @returns {Echo.PrivateChannel}
     */
    privateChannel(channel: string): PrivateChannel;

    /**
     * Get a presence channel instance by name.
     *
     * @param {string} channel
     * @returns {Echo.PresenceChannel}
     */
    presenceChannel(channel: string): PresenceChannel;

    /**
     * Leave the given channel.
     *
     * @param {string} channel
     */
    leave(channel: string): void;

    /**
     * Get the socket_id of the connection.
     *
     * @returns {string}
     */
    socketId(): string;

    /**
     * Disconnect from the Echo server.
     */
    disconnect(): void;
  }

  interface NullConnector extends Connector {
    /**
     * Create a new class instance.
     *
     * @param {Echo.NullConfig} options
     * @returns {Echo.NullConnector}
     */
    (options: NullConfig): Connector;

    /**
     * Listen for an event on a channel instance.
     *
     * @param {string} name
     * @param {string} event
     * @param {pusher.EventCallback} callback
     * @returns {Echo.PusherChannel}
     */
    listen(name: string, event: string, callback: pusher.EventCallback): NullChannel;

    /**
     * Get a channel instance by name.
     *
     * @param {string} name
     * @returns {Echo.PusherChannel}
     */
    channel(name: string): NullChannel;

    /**
     * Get a private channel instance by name.
     *
     * @param {string} name
     * @returns {Echo.PusherPrivateChannel}
     */
    privateChannel(name: string): NullPrivateChannel;

    /**
     * Get a presence channel instance by name.
     *
     * @param {string} name
     * @returns {Echo.PusherPresenceChannel}
     */
    presenceChannel(name: string): NullPresenceChannel;
  }

  interface PusherConnector extends Connector {
    /**
     * The Pusher instance.
     */
    pusher: Pusher;

    /**
     * Create a new class instance.
     *
     * @param {Echo.PusherConfig} options
     * @returns {Echo.PusherConnector}
     */
    (options: PusherConfig): Connector;

    /**
     * Listen for an event on a channel instance.
     *
     * @param {string} name
     * @param {string} event
     * @param {pusher.EventCallback} callback
     * @returns {Echo.PusherChannel}
     */
    listen(name: string, event: string, callback: pusher.EventCallback): PusherChannel;

    /**
     * Get a channel instance by name.
     *
     * @param {string} name
     * @returns {Echo.PusherChannel}
     */
    channel(name: string): PusherChannel;

    /**
     * Get a private channel instance by name.
     *
     * @param {string} name
     * @returns {Echo.PusherPrivateChannel}
     */
    privateChannel(name: string): PusherPrivateChannel;

    /**
     * Get a presence channel instance by name.
     *
     * @param {string} name
     * @returns {Echo.PusherPresenceChannel}
     */
    presenceChannel(name: string): PusherPresenceChannel;
  }

  interface SocketIoConnector extends Connector {
    /**
     * The Socket.io connection instance.
     */
    socket: SocketIOClient.Socket;

    /**
     * Create a new class instance.
     *
     * @param {Echo.SocketIoConfig} options
     * @returns {Echo.SocketIoConnector}
     */
    (options: SocketIoConfig): Connector;

    /**
     * Get socket.io module from global scope or options.
     *
     * @returns {typeof io}
     */
    getSocketIO(): SocketIOClientStatic;

    /**
     * Listen for an event on a channel instance.
     *
     * @param {string} name
     * @param {string} event
     * @param {(event: any) => void} callback
     * @returns {Echo.SocketIoChannel}
     */
    listen(name: string, event: string, callback: (event: any) => void): SocketIoChannel;

    /**
     * Get a channel instance by name.
     *
     * @param {string} name
     * @returns {Echo.SocketIoChannel}
     */
    channel(name: string): SocketIoChannel;

    /**
     * Get a private channel instance by name.
     *
     * @param {string} name
     * @returns {Echo.SocketIoPrivateChannel}
     */
    privateChannel(name: string): SocketIoPrivateChannel;

    /**
     * Get a presence channel instance by name.
     *
     * @param {string} name
     * @returns {Echo.SocketIoPresenceChannel}
     */
    presenceChannel(name: string): SocketIoPresenceChannel;
  }

  interface Channel {
    /**
     * The name of the channel.
     */
    name: string;

    /**
     * Channel options.
     */
    options: any;

    /**
     * The event formatter.
     */
    eventFormatter: EventFormatter;

    /**
     * Listen for an event on the channel instance.
     *
     * @param {string} event
     * @param {(event: any) => void} callback
     * @returns {Echo.Channel}
     */
    listen(event: string, callback: (event: any) => void): Channel;

    /**
     * Listen for a notification on the channel instance.
     *
     * @param {(notification: any) => void} callback
     * @returns {Echo.Channel}
     */
    notification(callback: (notification: any) => void): Channel;

    /**
     * Listen for a whisper event on the channel instance.
     *
     * @param {string} event
     * @param {(data: any) => void} callback
     * @returns {Echo.Channel}
     */
    listenForWhisper(event: string, callback: (data: any) => void): Channel;
  }

  interface PrivateChannel extends Channel {
    /**
     * Trigger client event on the channel.
     *
     * @param {string} event
     * @param data
     * @returns {Echo.PrivateChannel}
     */
    whisper(event: string, data: any): PrivateChannel;
  }

  interface PresenceChannel extends PrivateChannel {
    /**
     * Register a callback to be called anytime the member list changes.
     *
     * @param {(users: any[]) => void} callback
     * @returns {Echo.PresenceChannel}
     */
    here(callback: (users: any[]) => void): PresenceChannel;

    /**
     * Listen for someone joining the channel.
     *
     * @param {(user: any) => void} callback
     * @returns {Echo.PresenceChannel}
     */
    joining(callback: (user: any) => void): PresenceChannel;

    /**
     * Listen for someone leaving the channel.
     *
     * @param {(user: any) => void} callback
     * @returns {Echo.PresenceChannel}
     */
    leaving(callback: (user: any) => void): PresenceChannel;
  }

  interface NullChannel extends Channel {
    /**
     * Subscribe to a Null channel.
     */
    subscribe(): void;

    /**
     * Unsubscribe from a Null channel.
     */
    unsubscribe(): void;

    /**
     * Stop listening for an event on the channel instance.
     *
     * @param {string} event
     * @returns {Echo.NullChannel}
     */
    stopListening(event: string): Channel;

    /**
     * Bind a channel to an event.
     *
     * @param {string} event
     * @param {Null.EventCallback} callback
     * @returns {Echo.NullChannel}
     */
    on(event: string, callback: Null.EventCallback): Channel;
  }

  interface NullPrivateChannel extends NullChannel, PrivateChannel {
  }

  interface NullPresenceChannel extends NullPrivateChannel, PresenceChannel {
  }

  interface PusherChannel extends Channel {
    /**
     * The pusher client instance
     */
    pusher: Pusher;

    /**
     * The subscription of the channel.
     */
    subscription: pusher.Channel;

    /**
     * Create a new class instance.
     *
     * @param {pusher} pusher
     * @param {string} name
     * @param options
     * @returns {Echo.PusherChannel}
     */
    (pusher: Pusher, name: string, options: any): PusherChannel;

    /**
     * Subscribe to a Pusher channel.
     */
    subscribe(): void;

    /**
     * Unsubscribe from a Pusher channel.
     */
    unsubscribe(): void;

    /**
     * Stop listening for an event on the channel instance.
     *
     * @param {string} event
     * @returns {Echo.PusherChannel}
     */
    stopListening(event: string): Channel;

    /**
     * Bind a channel to an event.
     *
     * @param {string} event
     * @param {pusher.EventCallback} callback
     * @returns {Echo.PusherChannel}
     */
    on(event: string, callback: pusher.EventCallback): Channel;
  }

  interface PusherPrivateChannel extends PusherChannel, PrivateChannel {
  }

  interface PusherPresenceChannel extends PusherPrivateChannel, PresenceChannel {
  }

  interface SocketIoChannel extends Channel {
    /**
     * The SocketIo client instance
     */
    socket: io;

    /**
     * The event callbacks applied to the channel.
     */
    events: any;

    /**
     * Create a new class instance.
     *
     * @param {io} socket
     * @param {string} name
     * @param options
     * @returns {Echo.SocketIoChannel}
     */
    (socket: io, name: string, options: any): SocketIoChannel;

    /**
     * Subscribe to a SocketIo channel.
     */
    subscribe(): void;

    /**
     * Unsubscribe from a SocketIo channel.
     */
    unsubscribe(): void;

    /**
     * Bind a channel to an event.
     *
     * @param {string} event
     * @param {(event: any) => void} callback
     * @returns {Echo.SocketIoChannel}
     */
    on(event: string, callback: (event: any) => void): SocketIoChannel;

    /**
     * Attach a 'reconnect' listener and bind the event.
     */
    configureReconnector(): void;

    /**
     * Bind the channel's socket to an event and store the callback.
     *
     * @param {string} event
     * @param {(event: any) => void} callback
     * @returns {Echo.SocketIoChannel}
     */
    bind(event: string, callback: (event: any) => void): SocketIoChannel;

    /**
     * Unbind the channel's socket from all stored event callbacks.
     */
    unbind(): void;
  }

  interface SocketIoPrivateChannel extends SocketIoChannel, PrivateChannel {
  }

  interface SocketIoPresenceChannel extends SocketIoPrivateChannel, PresenceChannel {
  }

  interface EventFormatter {
    /**
     * Event namespace.
     */
    namespace: string | boolean;

    /**
     * Create a new class instance.
     *
     * @param {string | boolean} namespace
     * @returns {Echo.EventFormatter}
     */
    (namespace: string | boolean): EventFormatter;

    /**
     * Format the given event name.
     *
     * @param {string} event
     * @returns {string}
     */
    format(event: string): string;

    /**
     * Set the event namespace.
     *
     * @param {string | boolean} value
     */
    setNamespace(value: string | boolean): void;
  }
}

declare var Echo: Echo.EchoStatic;

/**
 * @hidden
 */
declare module 'laravel-echo' {
  export = Echo;
}
