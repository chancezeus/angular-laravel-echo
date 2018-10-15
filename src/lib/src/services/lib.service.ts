import {Inject, Injectable, InjectionToken, NgZone} from '@angular/core';
import {Observable, ReplaySubject, Subject, throwError} from 'rxjs';
import * as Echo from 'laravel-echo';
import * as io from 'socket.io-client';

/**
 * The token used to inject the config in Angular's DI system
 */
export const ECHO_CONFIG = new InjectionToken<EchoConfig>('echo.config');

/**
 * Service configuration
 */
export interface EchoConfig {
  /**
   * The name of the user model of the backend application
   */
  userModel: string;
  /**
   * The name of the namespace for notifications of the backend application
   */
  notificationNamespace: string | null;
  /**
   * Laravel Echo configuration
   */
  options: Echo.Config;
}

export interface NullEchoConfig extends EchoConfig {
  /**
   * Laravel Echo configuration
   */
  options: Echo.NullConfig;
}

export interface PusherEchoConfig extends EchoConfig {
  /**
   * Laravel Echo configuration
   */
  options: Echo.PusherConfig;
}

export interface SocketIoEchoConfig extends EchoConfig {
  /**
   * Laravel Echo configuration
   */
  options: Echo.SocketIoConfig;
}

/**
 * Possible channel types
 */
export declare type ChannelType = 'public' | 'presence' | 'private';

/**
 * @hidden
 */
interface Channel {
  name: string;
  channel: Echo.Channel;
  type: ChannelType;
  listeners: {
    [key: string]: Subject<any>;
  };
  users?: any[] | null;
}

/**
 * @hidden
 */
class TypeFormatter {
  /**
   * The namespace of the notifications.
   */
  private namespace: string | null = null;

  /**
   * Constructs a new formatter instance
   *
   * @param namespace The namespace of the notifications.
   */
  constructor(namespace: string | null) {
    this.setNamespace(namespace);
  }

  /**
   * Formats the supplied type
   *
   * @param notificationType The FQN of the notification class
   * @returns The optimized type
   */
  format(notificationType: string): string {
    if (!this.namespace) {
      return notificationType;
    }

    if (notificationType.indexOf(this.namespace) === 0) {
      return notificationType.substr(this.namespace.length);
    }

    return notificationType;
  }

  /**
   * Sets the namespace
   *
   * @param namespace The namespace of the notifications.
   * @returns The instance for chaining
   */
  setNamespace(namespace: string | null): TypeFormatter {
    this.namespace = namespace;

    return this;
  }
}

/**
 * The service class configuration, use this as something like:
 *
 * ```js
 * export const echoConfig: SocketIoEchoConfig = {
 *   userModel: 'App.User',
 *   notificationNamespace: 'App\\Notifications',
 *   options: {
 *     broadcaster: 'socket.io',
 *     host: window.location.hostname + ':6001'
 *   }
 * }
 *
 * @NgModule({
 *   ...
 *   providers: [
 *     ...
 *     EchoService,
 *     { provide: ECHO_CONFIG, useValue: echoConfig }
 *     ...
 *   ]
 *   ...
 * })
 * ```
 *
 * and import it in your component as
 *
 * ```js
 * @Component({
 * ...
 * })
 * export class ExampleComponent {
 *   constructor(echoService: EchoService) {
 *   }
 * }
 * ```
 */
@Injectable()
export class EchoService {
  private readonly _echo: Echo.EchoStatic;
  private readonly options: Echo.Config;
  private readonly typeFormatter: TypeFormatter;

  private readonly channels: Array<Channel> = [];
  private readonly notificationListeners: { [key: string]: Subject<any> } = {};

  private userChannelName: string | null = null;

  /**
   * Create a new service instance.
   *
   * @param ngZone NgZone instance
   * @param config Service configuration
   */
  constructor(private ngZone: NgZone,
              @Inject(ECHO_CONFIG) private config: EchoConfig) {
    let options = Object.assign({}, config.options);
    if (options.broadcaster === 'socket.io') {
      options = Object.assign({
        client: io
      }, options);
    }

    this._echo = new Echo(options);

    this.options = this.echo.connector.options;

    this.typeFormatter = new TypeFormatter(config.notificationNamespace);
  }

  /**
   * Is the socket connected
   */
  get connected(): boolean {
    if (this.options.broadcaster === 'null') {
      // Null broadcaster is always connected
      return true;
    }

    if (this.options.broadcaster === 'pusher') {
      return (<Echo.PusherConnector>this._echo.connector).pusher.connection.state === 'connected';
    }

    return (<Echo.SocketIoConnector>this._echo.connector).socket.connected;
  }

  /**
   * The echo instance, can be used to implement any custom requirements outside of this service (remember to include NgZone.run calls)
   */
  get echo(): Echo.EchoStatic {
    return this._echo;
  }

  /**
   * Gets the named and optionally typed channel from the channels array if it exists
   *
   * @param name The name of the channel
   * @param type The type of channel to lookup
   * @returns The channel if found or null
   */
  private getChannelFromArray(name: string, type: ChannelType | null = null): Channel | null {
    const channel = this.channels.find(channel => channel.name === name);
    if (channel) {
      if (type && channel.type !== type) {
        throw new Error(`Channel ${name} is not a ${type} channel`);
      }

      return channel;
    }

    return null;
  }

  /**
   * Gets the named and optionally typed channel from the channels array or throws if it does not exist
   *
   * @param name The name of the channel
   * @param type The type of channel to lookup
   * @returns The channel
   */
  private requireChannelFromArray(name: string, type: ChannelType | null = null): Channel {
    const channel = this.getChannelFromArray(name, type);
    if (!channel) {
      if (type) {
        throw new Error(`${type[0].toUpperCase()}${type.substr(1)} channel ${name} does not exist`);
      }

      throw new Error(`Channel ${name} does not exist`);
    }

    return channel;
  }

  /**
   * Fetch or create a public channel
   *
   * @param name The name of the channel to join
   * @returns The fetched or created channel
   */
  private publicChannel(name: string): Echo.Channel {
    let channel = this.getChannelFromArray(name, 'public');
    if (channel) {
      return channel.channel;
    }

    const echoChannel = this.echo.channel(name);

    channel = {
      name,
      channel: echoChannel,
      type: 'public',
      listeners: {},
    };

    this.channels.push(channel);

    return echoChannel;
  }

  /**
   * Fetch or create a presence channel and subscribe to the presence events
   *
   * @param name The name of the channel to join
   * @returns The fetched or created channel
   */
  private presenceChannel(name: string): Echo.PresenceChannel {
    let channel = this.getChannelFromArray(name, 'presence');
    if (channel) {
      return channel.channel as Echo.PresenceChannel;
    }

    const echoChannel = this.echo.join(name);

    channel = {
      name,
      channel: echoChannel,
      type: 'presence',
      listeners: {},
      users: null,
    };

    this.channels.push(channel);

    echoChannel.here((users: any[]) => {
      this.ngZone.run(() => {
        if (channel) {
          channel.users = users;

          if (channel.listeners['_users_']) {
            channel.listeners['_users_'].next(JSON.parse(JSON.stringify(users)));
          }
        }
      });
    });

    echoChannel.joining((user: any) => {
      this.ngZone.run(() => {
        if (channel) {
          channel.users = channel.users || [];
          channel.users.push(user);

          if (channel.listeners['_joining_']) {
            channel.listeners['_joining_'].next(JSON.parse(JSON.stringify(user)));
          }
        }
      });
    });

    echoChannel.leaving((user: any) => {
      this.ngZone.run(() => {
        if (channel) {
          channel.users = channel.users || [];

          const existing = channel.users.find(existing => existing == user);
          if (existing) {
            const index = channel.users.indexOf(existing);

            if (index !== -1) {
              channel.users.splice(index, 1);
            }
          }

          if (channel.listeners['_leaving_']) {
            channel.listeners['_leaving_'].next(JSON.parse(JSON.stringify(user)));
          }
        }
      });
    });

    return echoChannel;
  }

  /**
   * Fetch or create a private channel
   *
   * @param name The name of the channel to join
   * @returns The fetched or created channel
   */
  private privateChannel(name: string): Echo.PrivateChannel {
    let channel = this.getChannelFromArray(name, 'private');
    if (channel) {
      return channel.channel as Echo.PrivateChannel;
    }

    const echoChannel = this.echo.private(name);

    channel = {
      name,
      channel: echoChannel,
      type: 'private',
      listeners: {},
    };

    this.channels.push(channel);

    return echoChannel;
  }

  /**
   * Set authentication data and connect to and start listening for notifications on the users private channel
   *
   * @param headers Authentication headers to send when talking to the service
   * @param userId The current user's id
   * @returns The instance for chaining
   */
  login(headers: { [key: string]: string }, userId: string | number): EchoService {
    const newChannelName = `${this.config.userModel.replace('\\', '.')}.${userId}`;

    if (this.userChannelName && this.userChannelName != newChannelName) {
      this.logout();
    }

    this.options.auth = this.options.auth || {};
    this.options.auth.headers = Object.assign({}, headers);

    if (this.userChannelName != newChannelName) {
      this.userChannelName = newChannelName;

      this.privateChannel(newChannelName).notification((notification: any) => {
        const type = this.typeFormatter.format(notification.type);

        if (this.notificationListeners[type]) {
          this.ngZone.run(() => this.notificationListeners[type].next(notification));
        }

        if (this.notificationListeners['*']) {
          this.ngZone.run(() => this.notificationListeners['*'].next(notification));
        }
      });
    }

    return this;
  }

  /**
   * Clear authentication data and close any presence or private channels.
   *
   * @returns The instance for chaining
   */
  logout(): EchoService {
    this.channels
      .filter(channel => channel.type !== 'public')
      .forEach(channel => this.leave(channel.name));

    this.options.auth = this.options.auth || {};
    this.options.auth.headers = {};

    return this;
  }

  /**
   * Join a channel of specified name and type.
   *
   * @param name The name of the channel to join
   * @param type The type of channel to join
   * @returns The instance for chaining
   */
  join(name: string, type: ChannelType): EchoService {
    switch (type) {
      case 'public':
        this.publicChannel(name);
        break;
      case 'presence':
        this.presenceChannel(name);
        break;
      case 'private':
        this.privateChannel(name);
        break;
    }

    return this;
  }

  /**
   * Leave a channel of the specified name.
   *
   * @param name The name of the channel to leave
   * @returns The instance for chaining
   */
  leave(name: string): EchoService {
    const channel = this.getChannelFromArray(name);
    if (channel) {
      this.echo.leave(name);

      Object.keys(channel.listeners).forEach(key => channel.listeners[key].complete());

      const index = this.channels.indexOf(channel);
      if (index !== -1) {
        this.channels.splice(index, 1);
      }
    }

    return this;
  }

  /**
   * Listen for events on the specified channel.
   *
   * @param name The name of the channel
   * @param event The name of the event
   * @returns An observable that emits the event data of the specified event when it arrives
   */
  listen(name: string, event: string): Observable<any> {
    const channel = this.requireChannelFromArray(name);
    if (!channel.listeners[event]) {
      const listener = new Subject<any>();

      channel.channel.listen(event, (event: any) => this.ngZone.run(() => listener.next(event)));

      channel.listeners[event] = listener;
    }

    return channel.listeners[event].asObservable();
  }

  /**
   * Listen for client sent events (whispers) on the specified private or presence channel channel.
   *
   * @param name The name of the channel
   * @param event The name of the event
   * @returns An observable that emits the whisper data of the specified event when it arrives
   */
  listenForWhisper(name: string, event: string): Observable<any> {
    const channel = this.requireChannelFromArray(name);
    if (channel.type === 'public') {
      return throwError(new Error('Whisper is not available on public channels'));
    }

    if (!channel.listeners[`_whisper_${event}_`]) {
      const listener = new Subject<any>();

      channel.channel.listenForWhisper(event, (event: any) => this.ngZone.run(() => listener.next(event)));

      channel.listeners[`_whisper_${event}_`] = listener;
    }

    return channel.listeners[`_whisper_${event}_`].asObservable();
  }

  /**
   * Listen for notifications on the users private channel.
   *
   * @param type The type of notification to listen for or `*` for any
   * @returns An observable that emits the notification of the specified type when it arrives
   */
  notification(type: string): Observable<any> {
    type = this.typeFormatter.format(type);

    if (!this.notificationListeners[type]) {
      this.notificationListeners[type] = new Subject<any>();
    }

    return this.notificationListeners[type].asObservable();
  }

  /**
   * Listen for users joining the specified presence channel.
   *
   * @param name The name of the channel
   * @returns An observable that emits the user when he joins the specified channel
   */
  joining(name: string): Observable<any> {
    const channel = this.requireChannelFromArray(name, 'presence');

    if (!channel.listeners[`_joining_`]) {
      channel.listeners['_joining_'] = new Subject<any>();
    }

    return channel.listeners['_joining_'].asObservable();
  }

  /**
   * Listen for users leaving the specified presence channel.
   *
   * @param name The name of the channel
   * @returns An observable that emits the user when he leaves the specified channel
   */
  leaving(name: string): Observable<any> {
    const channel = this.requireChannelFromArray(name, 'presence');

    if (!channel.listeners[`_leaving_`]) {
      channel.listeners['_leaving_'] = new Subject<any>();
    }

    return channel.listeners['_leaving_'].asObservable();
  }

  /**
   * Listen for user list updates on the specified presence channel.
   *
   * @param name The name of the channel
   * @returns An observable that emits the initial user list as soon as it's available
   */
  users(name: string): Observable<any[]> {
    const channel = this.requireChannelFromArray(name, 'presence');

    if (!channel.listeners[`_users_`]) {
      channel.listeners['_users_'] = new ReplaySubject<any[]>(1);
    }

    return channel.listeners['_users_'].asObservable();
  }

  /**
   * Send a client event to the specified presence or private channel (whisper).
   *
   * @param name The name of the channel
   * @param event The name of the event
   * @param data The payload for the event
   * @returns The instance for chaining
   */
  whisper(name: string, event: string, data: any): EchoService {
    const channel = this.requireChannelFromArray(name);
    if (channel.type === 'public') {
      throw new Error('Whisper is not available on public channels');
    }

    const echoChannel = channel.channel as Echo.PrivateChannel;

    echoChannel.whisper(event, data);

    return this;
  }
}
