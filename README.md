# group-grunt-tasks

[![Build Status: Linux](http://img.shields.io/travis/andrezero/group-grunt-tasks/master.svg?style=flat-square)](https://travis-ci.org/andrezero/group-grunt-tasks)
[![NPM version](http://img.shields.io/npm/v/group-grunt-tasks.svg?style=flat-square)](https://npmjs.org/package/group-grunt-tasks)

> Grunt configuration utility: dynamically generates task groups from tagged tasks/targets.


## Getting Started

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the
[Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a
[Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins.

Install the utility with this command:

```shell
npm install group-grunt-tasks --save-dev
```

## The "group-grunt-tasks" utility

Easily create dynamic task/target groups like `group-after-tests` or `group-build-css` that you can use in different tasks.

_Note: The examples in this readme are drawn from our own exprience developing [AngularJS](https://angularjs.org/) with
the [ngbp](https://github.com/ngbp/ngbp) boilerplate._


### Configuration

You group your tasks/targets directly in your `Gruntfile.js` file before you invoke `grunt.initConfig()` by simply
decorating your existing targets with the '__groups' property.

The example below uses a [grunt-contrib-less](https://github.com/gruntjs/grunt-contrib-less) configuration:

```javascript
var config = {
  less: {
    options: {
      // ...
    }
  },
  build_main: {
    __groups: 'build_css',
    src: '<%= path.src %>/main.less',
    dest: '<%= path.build %>/<%= pkg.name %>.css',
    options: {
      sourceMap: true,
      dumpLineNumbers: 'all'
    }
  },
  build_plugins: {
    __groups: 'build_css',
    src: '<%= path.src %>/plugins/plugins.less',
    dest: '<%= path.build %>/plugins/plugins.css'
  },
  dist_main: {
    __groups: 'dist_css',
    // ...
  },
  dist_plugins: {
    __groups: 'dist_css',
    // ...
    options: {
      compress: true
    }
  }
};
```

You will need to invoke the utlity from your project's `Gruntfile.js` gruntfile, before you invoke `grunt.initConfig()`:

```javascript
// declare config, declaring your configuration, including the `__groups` properties.
var config = { /*...*/ };

// register group tasks
groups = require('group-grunt-tasks')(grunt, options);
groups.collect(config);

grunt.initConfig(config);
```

The above `less` configuration naturally results in all the following `less` targets:

```
+ less:build_main
+ less:build_plugins
+ less:dist_main
+ less:dist_plugins
```

But, aditionally, it will also result in the following Grunt tasks being registered:

```
+ group-build_css = ['less:build_main', 'less:build_plugins']
+ group-dist_css = ['less:dist_main', 'less:dist_main_min']
```

The advantage of this approach is that if you have an exploding number of `less:build_xxx`, `less:dist_xxx` or any other
environment or platform variants fot the `less` tasks, you can now invoke them all at once using the tag alias:

```shell
grunt group-build_css
```

Also, everytime you tag another `build_css` or `dist_css` target for tasks like `less`, `concat`, `uglify`,
you do not have to update your `build` and `dist` tasks ever again because the groups are automatically updated every
time Grunt runs.

You can also then reference the dynamically registered `group-build_...` tasks in your `Gruntfile.js` gruntfile.

```javascript
grunt.registerTask('build', [
  // ...
  'group-build_css',
  'group-build_js'
  // ...
]);

grunt.registerTask('dist', [
  // ...
  'group-dist_css',
  'group-dist_js',
  // ...
]);
```

In case you temporarily delete or untag _ALL_ tasks/targets that were tagged with `__groups: build_js`, the corresponding
`group-dist_js` task will no longer be registered and Grunt will fail to start.

```
Warning: Task "group-build_js" not found. Use --force to continue.
```

To prevent this, instead of having to `//` comment out the offending group in the `dist` task, you can use the following
alias to `grunt.registerTask()`:

```javascript
// notice the `.groups.` after grunt ;-)
grunt.groups.registerTask('build', [
  // ...
  'group-build_css',
  'group-build_js'
  // ...
]);
```

The utility will automatically register any task prefixed with `group-` that does not exist yet. If you execute
`grunt build` now, instead of an error you will get a friendly warning.

```
Running "group-build_js" task
>> Group task "group-build_js" is empty. To add tasks, tag them with "__groups: group-build_js".
```


### Methods

#### Constructor(grunt, options)

When requiring the module you need to provide Grunt instance and, optionally, an options object to configure it.

__Arguments:__

- __grunt__ : `Object` - Grunt instance.
- __options__ : `Object` -

__Returns:__

`Object` - The module api.

__Example__:

```javascript
var options = {
  tag: '__groups', // The property to look for in the tasks/targets.
  prefix: 'tag-'   // Every task generated will be prefixed with 'group-'.
};
var groups = require('group-grunt-tasks')(grunt, options);
```


#### + groups.collect(config)

Collects groups and grouped tasks/targets.

You should call this method before calling `grunt.initConfig(config)` and before regstering any tasks that may refer to
the groups.

You can call the method more than once, and it will register more groups and augment existing ones, thought there is no
reason why should do that.

__Arguments:__

- __config__ : `Object` - The Grunt configuration object.

__Returns:__

`Array` - Collected groups.

__Example:__

```javascript
var config = { ... };
groups.collect(config);
```


#### + groups.registerTask(task, subTasks)

Registers the `task` making sure all the `subTasks` that are prefixed with `opts.prefix` exist.

__Arguments:__

- __task__ : `string` - Name of the task to register.
- __subTasks__ : `String|Array` - Name of the grunt tasks to include in the group.

__Returns:__

`Object` - Loaded data.

__Example:__

```javascript
module.exports = function (grunt) {
  grunt.groups.registerTask('build', [
    'group-build_prepare',
    'group-build_test',
    'group-build_js',
    'group-build_css',
    'group-build_finish',
    'something',       // any non-prefixed task that does not exist will not be registered
    'something-else'   //   and Grunt still abort when starting
  ]};
};
```


#### --verbose

If you want to double-check what _tag tasks_ are being generated, use --verbose:

```
grunt something:something --verbose

...

group-grunt-tasks: collect task/target tagged with "group-".
Registering 3 task(s) with prefix "group".
+ task: group-build_css = [less:examples, less:build_main]
+ task: group-dist_css = [less:dist_main, less:dist_main_min]
+ task: group-examples = [html2js:main, less:examples, ngindex:example]
```


### Gotchas

#### Order of Grunt setup steps DOES matter

This utility needs to be invoked after loading (at least some) config and before invoking `grunt.initConfig()`.

This utility is best used in conjunction with the [load-grunt-tasks](https://github.com/sindresorhus/load-grunt-tasks)
utility, the [load-grunt-configs](https://github.com/andrezero/load-grunt-config-data) utility and the
[grunt.task.loadTasks()](http://gruntjs.com/api/grunt.task#grunt.task.loadtasks) strategy.

The only order that makes sense is:

```javascript
var loader = require('group-grunt-tasks');
var groups = require('group-grunt-tasks')(grunt);

// declare/load your config
var config = { ... };
loader.merge(grunt, '/config/**/*.js', config);

// collect groups and register group tasks
groups.collect(config);

// init config
grunt.initConfig(config);

// load more tasks
grunt.loadTasks('grunt/tasks');
```

#### Beware of name collisions

If you are not using the 'prefix' option (see below) you may run into serious problems.

For instance if you tag some task with `__groups: ['copy']` this tool will override the existing `copy` task.

---

## Roadmap

- tidy up readme
- test coverage
- check interaction with watch, watch reload and the necessity of regenrating the groups
- investigate how to run tasks in parallel (probably registering a proxy fn per group in Grunt) and benchmark it!


## Credits and Acknowlegdments

Special thanks to [@JaimeBeneitez](https://github.com/JaimeBeneytez) for raising the standard on how to setup uniform
grunt task configurations across our growing ecosystem of libraries and apps over at [EF CTX](https://github.com/EFEducationFirstMobile).


## [MIT License](LICENSE-MIT)

[Copyright (c) 2014 Andre Torgal](http://andrezero.mit-license.org/2014)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
