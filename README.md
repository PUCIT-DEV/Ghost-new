<a href="https://github.com/TryGhost/Ghost"><img src="https://cloud.githubusercontent.com/assets/120485/18661790/cf942eda-7f17-11e6-9eb6-9c65bfc2abd8.png" alt="Ghost" /></a>
<a href="https://travis-ci.org/TryGhost/Ghost"><img align="right" src="https://travis-ci.org/TryGhost/Ghost.svg?branch=master" alt="Build status" /></a>

<a href="https://dev.ghost.org/lts"><img src="https://cloud.githubusercontent.com/assets/120485/18661856/0930282e-7f18-11e6-948a-00546393fd93.png" alt="Warning: Major release in progress. Expect things to be broken in master." /></a>

The project is maintained by a non-profit organisation called the **Ghost Foundation**, along with an amazing group of independent [contributors](https://github.com/TryGhost/Ghost/contributors). We're trying to make publishing software that changes the shape of online journalism.

- [Ghost.org](https://ghost.org)
- [Latest Release](https://ghost.org/developers/)
- [Support](http://support.ghost.org/)
- [Theme Docs](http://themes.ghost.org)
- [Contributing Guide](https://github.com/TryGhost/Ghost/blob/master/.github/CONTRIBUTING.md)
- [Feature Requests](http://ideas.ghost.org/)
- [Developer Blog](http://dev.ghost.org)

**NOTE: If you’re stuck, can’t get something working or need some help, please head on over and join our [Slack community](https://ghost.org/slack/) rather than opening an issue.**

&nbsp;

# Ghost 1.0-alpha Developer Install

**Please note:** These are the install instructions for Ghost 1.0-alpha, which is **not** stable. If you're looking for the latest release of Ghost, check out the [stable branch](https://github.com/TryGhost/Ghost/tree/stable) or the [latest release](https://github.com/TryGhost/Ghost/releases). If you get stuck, come say hi over [on slack](https://slack.ghost.org)!

**Important**: Ghost uses [`yarn`](https://yarnpkg.com) rather than `npm` to manage it's dependencies. Ensure that you have it installed and you have configured your `PATH` environment variable for it to work correctly. We recommend the ["Installation Script" instructions](https://yarnpkg.com/en/docs/install#alternatives-tab) because it works better with `nvm` but choose the best option for your development setup.

Install and run Ghost.
<pre>
<b>git clone git@github.com:TryGhost/Ghost.git ghost</b>
    Download the Ghost code base
<b>npm run init</b>
    Short command for: yarn global add knex-migrator ember-cli grunt-cli && yarn install && grunt init
<b>knex-migrator init</b>
    Creates and initialises your database
<b>grunt dev</b>
    Starts the express server and ember build
</pre>

Run server tests

```bash
grunt test-all
```

Run client tests
```bash
cd core/client
ember test
```


Read more about the [development workflows](https://github.com/TryGhost/Ghost/wiki/Working-with-Ghost).

# Deploying Ghost

<a href="https://ghost.org/pricing"><img src="https://cloud.githubusercontent.com/assets/120485/18662071/f30da886-7f18-11e6-90f2-42c0ade79fd1.png" alt="Ghost(Pro)" /></a>

The easiest way to deploy Ghost is with our official **[Ghost(Pro)](https://ghost.org/pricing/)** managed service. You can have a fresh instance up and running in a couple of clicks with a worldwide CDN, backups, security and maintenance all done for you.

Not only will it save you [many hours per month](https://ghost.org/ghost-pro-vs-self-hosting/), but all revenue goes to the Ghost Foundation, which funds the maintenance and further development of Ghost itself. So you’ll be supporting open source software *and* getting a great service **at the same time**! Talk about win/win. :trophy:

[Other options](http://support.ghost.org/deploying-ghost/) are also available if you prefer playing around with servers by yourself, of course. The freedom of choice is in your hands.

&nbsp;


# Staying Up to Date

When a new version of Ghost comes out, you'll want to look over these [upgrade instructions](http://support.ghost.org/how-to-upgrade/) for what to do next.

You can talk to other Ghost users and developers in our [public Slack team](https://ghost.org/slack/) (it's pretty awesome). We have a public meeting every Tuesday at 5:30pm UK time.

New releases are announced on the [dev blog](http://dev.ghost.org/tag/releases/). You can subscribe by email or follow [@TryGhost_Dev](https://twitter.com/tryghost_dev) on Twitter, if you prefer your updates bite-sized and facetious. :saxophone::turtle:

&nbsp;


# Copyright & License

Copyright (c) 2013-2017 Ghost Foundation - Released under the [MIT license](LICENSE).
