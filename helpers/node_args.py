#!/usr/bin/env python
import os
import json
import roslaunch
import rosgraph
import sys

from roslaunch.node_args import create_local_process_args
from roslaunch.core import setup_env

if __name__ == '__main__':
    debug_node_name = None
    debug_node_args = None
    debug_launch_file = None

    if len(sys.argv) != 3:
        print 'usage: %s launch_file node_name' % sys.argv[0]
        exit(1)

    debug_launch_file = sys.argv[1]
    debug_node_name = sys.argv[2]

    env = None
    args = None
    error = None
    debug_node = None

    config = roslaunch.config.load_config_default([debug_launch_file], None)
    for node in (config.nodes + config.tests):
        fullname = rosgraph.names.ns_join(node.namespace, node.name)
        if fullname == debug_node_name:
            debug_node = node

    if debug_node is None:
        error = "Could not find a definition for %s" % debug_node_name
    else:
        env = setup_env(debug_node, debug_node.machine, os.environ[rosgraph.ROS_MASTER_URI])
        args = create_local_process_args(debug_node, debug_node.machine)

    print(json.dumps({ 'env': env, 'args': args, 'error': error }))
