declare namespace Echo {
  import {Pusher} from 'pusher-js';
  import * as pusher from 'pusher-js';
  import * as io from 'socket.io-client';

  interface EchoStatic {
    /**
     * The broadcasting connector.
     */
    connector: Echo.PusherConnector | Echo.SocketIoConnector;

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
    auth?: {
      headers?: {}
    },
    authEndpoint?: string;
    broadcaster?: string;
    csrfToken?: string | null;
    namespace?: string;
  }

  interface PusherConfig extends Config, pusher.Config {
    key?: string | null;
  }

  interface SocketIoConfig extends Config, SocketIOClient.ConnectOpts {
    client?: typeof io;
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

  interface PusherConnector extends Connector {
    /**
     * The Pusher instance.
     */
    pusher: Pusher;

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
    socket: io;

    /**
     * Get socket.io module from global scope or options.
     *
     * @returns {typeof io}
     */
    getSocketIO(): typeof io;

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
     * Listen for an event on the channel instance.
     *
     * @param {string} event
     * @param {pusher.EventCallback} callback
     * @returns {Echo.PusherChannel}
     */
    listen(event: string, callback: pusher.EventCallback): PusherChannel;

    /**
     * Stop listening for an event on the channel instance.
     *
     * @param {string} event
     * @returns {Echo.PusherChannel}
     */
    stopListening(event: string): PusherChannel;

    /**
     * Bind a channel to an event.
     *
     * @param {string} event
     * @param {pusher.EventCallback} callback
     * @returns {Echo.PusherChannel}
     */
    on(event: string, callback: pusher.EventCallback): PusherChannel;
  }

  interface PusherPrivateChannel extends PusherChannel, PrivateChannel {
    /**
     * Trigger client event on the channel.
     *
     * @param {string} eventName
     * @param data
     * @returns {Echo.PusherPrivateChannel}
     */
    whisper(eventName: string, data: any): PusherPrivateChannel;
  }

  interface PusherPresenceChannel extends PusherPrivateChannel, PresenceChannel {
    /**
     * Register a callback to be called anytime the member list changes.
     *
     * @param {(users: any[]) => void} callback
     * @returns {Echo.PusherPresenceChannel}
     */
    here(callback: (users: any[]) => void): PusherPresenceChannel;

    /**
     * Listen for someone joining the channel.
     *
     * @param {(user: any) => void} callback
     * @returns {Echo.PusherPresenceChannel}
     */
    joining(callback: (user: any) => void): PusherPresenceChannel;

    /**
     * Listen for someone leaving the channel.
     *
     * @param {(user: any) => void} callback
     * @returns {Echo.PusherPresenceChannel}
     */
    leaving(callback: (user: any) => void): PusherPresenceChannel;
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
     * Listen for an event on the channel instance.
     *
     * @param {string} event
     * @param {(event: any) => void} callback
     * @returns {Echo.SocketIoChannel}
     */
    listen(event: string, callback: (event: any) => void): SocketIoChannel;

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
    /**
     * Trigger client event on the channel.
     *
     * @param {string} eventName
     * @param data
     * @returns {Echo.SocketIoPrivateChannel}
     */
    whisper(eventName: string, data: any): SocketIoPrivateChannel;
  }

  interface SocketIoPresenceChannel extends SocketIoPrivateChannel, PresenceChannel {
    /**
     * Register a callback to be called anytime the member list changes.
     *
     * @param {(users: any[]) => void} callback
     * @returns {Echo.SocketIoPresenceChannel}
     */
    here(callback: (users: any[]) => void): SocketIoPresenceChannel;

    /**
     * Listen for someone joining the channel.
     *
     * @param {(user: any) => void} callback
     * @returns {Echo.SocketIoPresenceChannel}
     */
    joining(callback: (user: any) => void): SocketIoPresenceChannel;

    /**
     * Listen for someone leaving the channel.
     *
     * @param {(user: any) => void} callback
     * @returns {Echo.SocketIoPresenceChannel}
     */
    leaving(callback: (user: any) => void): SocketIoPresenceChannel;
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

declare module 'laravel-echo' {
  export = Echo;
}
