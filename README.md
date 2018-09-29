# Angular Laravel Echo

This package is a simple service to allow easy integration of Laravel Echo into angular. The service tries to follow the general functionality
of Laravel Echo as closely as possible. The most important difference is the use of Observable streams instead of callbacks for events/notifications,
this simplifies integration into Angular a lot and (more importantly) makes sure only one listener per subscribed event/notification has to be created.

One important note is that (since Laravel Echo itself does not supply a way to stop listening for events) you must make sure to call leave for any channel
that is no longer required, not just unsubscribe the event subscriptions (otherwise a memory leak will occur).

# Versions

With the release of Angular 6.0, breaking changes were introduced in the form of the updated dependency on RxJS 6 so consult
the following chart for what version of the package to use based on your version of Angular.

| Angular Version | Package Version |
|:---------------:|:---------------:|
| \>= 6.0         | 2.*             |
| < 6.0           | 1.*             |

# Documentation

Documentation for the module is available on github pages at [https://chancezeus.github.io/angular-laravel-echo/](https://chancezeus.github.io/angular-laravel-echo/)

# Contributors

- [ChanceZeus](https://github.com/chancezeus): Initial author of the package
- [Wizofgoz](https://github.com/Wizofgoz): Angular 6+ support
