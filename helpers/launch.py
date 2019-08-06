#!/usr/bin/env python
import logging
import roslaunch
import rosgraph
import os
import sys

from roslaunch.node_args import create_local_process_args
from roslaunch.core import printerrlog, RLException, setup_env

import roslaunch.config
import roslaunch.launch
import roslaunch.pmon
import roslaunch.server

load_config_default = roslaunch.config.load_config_default

class ROSLaunchParent(object):
    def __init__(self, run_id, roslaunch_files, exclude_node=None, port=None):
        self.logger = logging.getLogger('roslaunch.parent')
        self.run_id = run_id
        self.roslaunch_files = roslaunch_files
        self.port = port
        self.exclude_node = exclude_node
        self.is_test = False

        self._shutting_down = False
        self.config = self.runner = self.server = self.pm = self.remote_runner = None

    def _exclude_node(self, node_list):
        if self.exclude_node is None:
            return
        for node in node_list:
            fullname = rosgraph.names.ns_join(node.namespace, node.name)
            if fullname == self.exclude_node:
                node_list.remove(node)

    def _load_config(self):
        self.config = roslaunch.config.load_config_default(self.roslaunch_files, self.port)
        self._exclude_node(self.config.nodes)
        self.is_test = (len(filter(lambda x: rosgraph.names.ns_join(x.namespace, x.name) == self.exclude_node, self.config.tests)) > 0)

    def _start_pm(self):
        self.pm = roslaunch.pmon.start_process_monitor()

    def _init_runner(self):
        if self.config is None:
            raise RLException("config is not initialized")
        if self.pm is None:
            raise RLException("pm is not initialized")
        if self.server is None:
            raise RLException("server is not initialized")
        self.runner = roslaunch.launch.ROSLaunchRunner(self.run_id, self.config,
            server_uri=self.server.uri, pmon=self.pm, remote_runner=self.remote_runner)

        print(self.config.summary(local=self.remote_runner is None))
        if self.config:
            for err in self.config.config_errors:
                printerrlog("WARNING: %s"%err)

    def _start_server(self):
        if self.config is None:
            raise RLException("config is not initialized")
        if self.pm is None:
            raise RLException("pm is not initialized")

        self.logger.info("starting parent XML-RPC server")
        self.server = roslaunch.server.ROSLaunchParentNode(self.config, self.pm)
        self.server.start()
        if not self.server.uri:
            raise RLException("server URI did not initialize")
        self.logger.info("... parent XML-RPC server started")

    def _init_remote(self):
        if self.config is None:
            raise RLException("config is not initialized")
        if self.pm is None:
            raise RLException("pm is not initialized")
        if self.server is None:
            raise RLException("server is not initialized")
        if self.config.has_remote_nodes():
            import roslaunch.remote
            self.remote_runner = roslaunch.remote.ROSRemoteRunner(self.run_id, self.config, self.pm, self.server)

    def _start_remote(self):
        if self.remote_runner is None:
            self._init_remote()

        if self.remote_runner is not None:
            self.remote_runner.start_children()

    def _start_infrastructure(self):
        if self.config is None:
            self._load_config()
        if self.pm is None:
            self._start_pm()
        if self.server is None:
            self._start_server()

        self._start_remote()

    def _stop_infrastructure(self):
        if self._shutting_down:
            return
        self._shutting_down = True

        if self.server:
            try:
                self.server.shutdown("roslaunch parent complete")
            except:
                pass
        if self.pm:
            self.pm.shutdown()
            self.pm.join()

    def start(self, auto_terminate=True):
        self.logger.info("starting roslaunch parent run")
        try:
            self._start_infrastructure()
        except:
            self._stop_infrastructure()
            raise

        self._init_runner()
        self.runner.launch()

        if auto_terminate:
            self.pm.registrations_complete()

        self.logger.info("... roslaunch parent running, waiting for process exit")
        if not self.is_test:
            for test in self.config.tests:
                test.output = 'screen'
                self.runner.run_test(test)

    def spin(self):
        if not self.runner:
            raise RLException("parent not started yet")
        try:
            self.runner.spin()
        finally:
            self._stop_infrastructure()

    def shutdown(self):
        self._stop_infrastructure()

def get_or_generate_uuid():
    param_server = rosgraph.Master('/roslaunch')
    val = None
    while val is None:
        try:
            val = param_server.getParam('/run_id')
        except:
            import uuid
            val = str(uuid.uuid1())
    return val

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print 'usage: %s launch_file node_name' % sys.argv[0]
        exit(1)

    debug_launch_file = sys.argv[1]
    debug_node_name = sys.argv[2]

    uuid = get_or_generate_uuid()
    roslaunch.configure_logging(uuid)
    parent = ROSLaunchParent(uuid, [debug_launch_file], exclude_node=debug_node_name)
    parent.start()
    if parent.is_test:
        parent.spin()
    else:
        parent.runner.stop()
