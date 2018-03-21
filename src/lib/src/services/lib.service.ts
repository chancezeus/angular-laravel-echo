import {Inject, Injectable, InjectionToken, NgZone} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {ReplaySubject} from 'rxjs/ReplaySubject';
import {Subject} from 'rxjs/Subject';
import * as Echo from 'laravel-echo';
import * as io from 'socket.io-client';

export const ECHO_CONFIG = new InjectionToken<EchoConfig>('echo.config');

export interface EchoConfig {
  userModel: string;
  notificationNamespace: string | null;
  options: Echo.Config;
}

export interface PusherEchoConfig extends EchoConfig {
  options: Echo.PusherConfig;
}

export interface SocketIoEchoConfig extends EchoConfig {
  options: Echo.SocketIoConfig;
}

export declare type ChannelType = 'public' | 'presence' | 'private';

interface Channel {
  name: string;
  channel: Echo.Channel;
  type: ChannelType;
  listeners: {
    [key: string]: Subject<any>;
  };
  users?: any[] | null;
}

class TypeFormatter {
  private namespace: string | null;

  /**
   * Constructs a new formatter instance
   */
  constructor(namespace: string | null) {
    this.setNamespace(namespace);
  }

  /**
   * Formats the supplied type
   */
  format(notificationType: string) {
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
   */
  setNamespace(namespace: string | null) {
    this.namespace = namespace;
  }
}

@Injectable()
export class EchoService {
  private echo: Echo.EchoStatic;
  private options: Echo.Config;
  private typeFormatter: TypeFormatter;

  private channels: Array<Channel> = [];
  private userChannelName: string | null;
  private notificationListeners: { [key: string]: Subject<any> } = {};

  /**
   * Create a new service instance.
   */
  constructor(private ngZone: NgZone,
              @Inject(ECHO_CONFIG) private config: EchoConfig) {
    let options = Object.assign({}, config.options);
    if (options.broadcaster === 'socket.io') {
      options = Object.assign({
        client: io
      }, options);
    }

    this.echo = new Echo(options);

    this.options = this.echo.connector.options;

    this.typeFormatter = new TypeFormatter(config.notificationNamespace);
  }

  /**
   * Gets the named and optionally typed channel from the channels array if it exists
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
   * Join a public channel
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
   * Join a presence channel and subscribe to the presence event
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

    echoChannel.here(users => {
      if (channel) {
        channel.users = users;

        if (channel.listeners['_users_']) {
          channel.listeners['_users_'].next(JSON.parse(JSON.stringify(users)));
        }
      }
    });

    echoChannel.joining(user => {
      if (channel) {
        channel.users = channel.users || [];
        channel.users.push(user);

        if (channel.listeners['_joining_']) {
          channel.listeners['_joining_'].next(JSON.parse(JSON.stringify(user)));
        }
      }
    });

    echoChannel.leaving(user => {
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

    return echoChannel;
  }

  /**
   * Join a private channel
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
   */
  login(headers: { [key: string]: string }, userId: string | number): EchoService {
    const newChannelName = `${this.config.userModel.replace('\\', '.')}.${userId}`;

    if (this.userChannelName && this.userChannelName != newChannelName) {
      this.leave(this.userChannelName);
    }

    this.options.auth = this.options.auth || {};
    this.options.auth.headers = Object.assign({}, headers);

    if (this.userChannelName != newChannelName) {
      this.userChannelName = newChannelName;

      this.privateChannel(newChannelName).notification(notification => {
        const type = this.typeFormatter.format(notification.type);

        if (this.notificationListeners[type]) {
          this.ngZone.run(() => this.notificationListeners[type].next(notification));
        }
      });
    }

    return this;
  }

  /**
   * Clear authentication data and close any presence or private channels.
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
   */
  listenForWhisper(name: string, event: string): Observable<any> {
    const channel = this.requireChannelFromArray(name);
    if (channel.type === 'public') {
      throw new Error('Whisper is not available on public channels');
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
   */
  users(name: string): Observable<any[]> {
    const channel = this.requireChannelFromArray(name, 'presence');

    if (!channel.listeners[`_users_`]) {
      channel.listeners['_users_'] = new ReplaySubject<any[]>(1);
    }

    return channel.listeners['_users_'].asObservable();
  }

  /**
   * Send a client event to the channel (whisper).
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
