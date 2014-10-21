'use strict';

var util = require('util');
var glob = require('glob');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

/**
 * @param {object} grunt   instance.
 * @param {object} config  object to collect tagged tasks/targets from.
 * @param {object} options of this utility.
 *
 * @returns {array} registered group names (all prefix with opts.prefix).
 */
function collectGroups(grunt, config, opts) {

    if (grunt.option('verbose')) {
        grunt.verbose.subhead('Util group-grunt-tasks: collect groups from tasks/targets.');
    }

    var groupTasks = {};

    /**
     * @param {string} taskOrTarget to
     *
     */
    function pushToGroups(taskOrTarget, groupNames, options) {

        groupNames = _.isString(groupNames) ? [groupNames] : groupNames;

        var name;
        groupNames.forEach(function (groupName) {
            name = opts.prefix ? (opts.prefix + groupName) : groupName;
            groupTasks[name] = groupTasks[name] || [];
            groupTasks[name].push(taskOrTarget);
        });
    }

    var task;
    var target;
    var props;
    // loop through tasks
    _.forEach(config || {}, function (taskData, task) {
        // assume it is NOT a multi-task if some tag property is found
        if (taskData.hasOwnProperty(opts.tag)) {
            pushToGroups(task, taskData[opts.tag]);
        }
        // OR assume it IS a multi-task
        else {
            // and look for tag property in each target
            _.forEach(taskData || {}, function (targetData, target) {
                if (targetData.hasOwnProperty(opts.tag)) {
                    pushToGroups(task + ':' + target, targetData[opts.tag]);
                }
            });
        }
    });

    // log before registering tasks
    if (grunt.option('verbose')) {
        var length = _.keys(groupTasks).length;
        grunt.verbose.writeln('Found ' + length + ' groups(s) tagged with ' + opts.tag.cyan + '.');
        if (length) {
            grunt.verbose.writeln('Registering tasks' + (opts.prefix ? (' with prefix ' + opts.prefix.cyan + ':') : ':'));
        }
    }

    // register the tasks
    var log = [];
    var group;
    for (group in groupTasks) {
        grunt.registerTask(group, groupTasks[group]);
        if (grunt.option('verbose')) {
            log.push('+ ' + group.cyan + ': [' + groupTasks[group].join(', ') + ']');
        }
    }

    // log registered tasks
    var line;
    if (grunt.option('verbose')) {
        for (line in log) {
            grunt.verbose.writeln(log[line]);
        }
        grunt.verbose.writeln();
    }

    return Object.keys(groupTasks);
}

/**
 * @param {object}       grunt   instance.
 * @param {string|array} groups  to check (and register). Names must be already prefixed with `opts.prefix`.
 * @param {object}       options of this utility.
 */
function ensureGroupTasksExist(grunt, groups, opts) {
    var group;
    _.forEach(groups, function (group) {
        if (!grunt.task.exists(group)) {
            grunt.verbose.writeln('+ ' + group.cyan + ' (group-grunt-tasks: empty group)');
            // the placebo function will log
            grunt.registerTask(group, function () {
                grunt.log.warn('Group task "' + group + '" is empty. To add tasks, tag them with "' + opts.tag + ': ' + group + '".');
            });
        }
    });
}

/**
 * Utility to group tasks that are tagged with the same group tag and register the group tasks.
 *
 * @param {object} grunt   Grunt instance.
 * @param {object} options Optional options object.
 *
 * @returns {object} module api
 */
module.exports = function (grunt, options) {

    // validate arguments
    if (!_.isObject(grunt)) {
        grunt.fatal('group-grunt-tasks() expects argument #1 to be the Grunt instance. Provided type: "' + typeof grunt + '".');
    }
    if (options && !_.isObject(options)) {
        grunt.fatal('group-grunt-tasks() expects argument #2 to be options object. Provided type: "' + typeof options + '".');
    }

    var opts = _.extend({
        prefix: 'group-',
        tag: '__groups'
    }, options);

    var collectedGroups = [];

    var api = {

        /**
         * Collects groups and grouped tasks/targets.
         *
         * @param {object} config  Grunt configuration object to collect tagged tasks/targets from.
         *
         * @returns {array} Collected groups.
         */
        collect: function (config) {

            // validate arguments
            if (!_.isObject(config)) {
                grunt.fatal('Util group-grunt-tasks::config() expects argument #1 to be a Grunt configuration. Provided type: "' + typeof config + '".');
            }

            var groups = collectGroups(grunt, config, opts);

            // not really using this at the moment
            // but it becomes necessary, don't forget to uniq() it
            collectedGroups = collectedGroups.concat(groups);

            return groups;
        },

        /**
         * Registers tasks, making sure all the subTasks not prefixed with `opts.pref` exist.
         *
         * @param {string}       task     Name of the task to register.
         * @param {string|array} subTasks Name of the grunt tasks to include in the group. Group tasks MUST be already prefixed with `opts.prefix`.
         */
        registerTask: function (task, subTasks) {

            // validate arguments
            if (!_.isString(task)) {
                grunt.fatal('Util group-grunt-tasks::registerTask() expects argument #1 to be a string or an array of strings. Provided type: "' + typeof task + '".');
            }

            // normalize subTasks to []
            subTasks = _.isString(subTasks) ? [subTasks] : subTasks;

            // and validate it too
            if (!_.isArray(subTasks)) {
                grunt.fatal('Util group-grunt-tasks::registerTask() expects argument #2 to be a string or an array of strings. Provided type: "' + typeof subTasks + '".');
            }

            // verify each
            var groupTasks = [];
            _.forEach(subTasks, function (task, index) {
                if (!_.isString(task)) {
                    grunt.fatal('Util group-grunt-tasks::registerTask() expects argument #1 to be a string or an array of strings. Task #"' + index + '" is of type: "' + typeof task + '".');
                }
                // and collect the group ones (prefixed with our option)
                if (task.indexOf(opts.prefix) === 0) {
                    groupTasks.push(task);
                }
            });

            // ensure all groups exit
            if (groupTasks.length) {
                ensureGroupTasksExist(grunt, groupTasks, opts);
            }

            // and register task
            grunt.registerTask(task, subTasks);
        },

        /**
         * Ensure all these groups exist.
         *
         * @param {string|array} groups A list of group groups, without their prefix.
         */
        ensureGroupsExist: function (groups) {

            groups = _.isString(groups) ? [groups] : groups;

            if (!_.isArray(groups)) {
                grunt.fatal('Util group-grunt-tasks::ensureGroupsExist() expects argument #1 to be a string or an array of strings. Provided type: "' + typeof groups + '".');
            }

            _.forEach(groups, function (task, index) {
                if (!_.isString(task)) {
                    grunt.fatal('Util group-grunt-tasks::ensureGroupsExist() expects argument #1 to be a string or an array of strings. Task #"' + index + '" is of type: "' + typeof task + '".');
                }
                groups[index] = opts.prefix ? (opts.prefix + task) : task;
            });

            ensureGroupTasksExist(grunt, groups, opts);
        }
    };

    grunt.groups = api;

    return api;
};

