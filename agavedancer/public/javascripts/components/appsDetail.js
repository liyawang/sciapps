'use strict';

import React from 'react';
import Reflux from 'reflux';
import AppsStore from '../stores/appsStore.js';
import AppsActions from '../actions/appsActions.js';
import dsActions from '../actions/dsActions.js';
import WorkflowActions from '../actions/workflowActions.js';
import {Panel, Table, Jumbotron} from 'react-bootstrap';
import AppsInfo from './appsInfo.js';
import AppsForm from './appsForm.js';
import Welcome from './welcome.js';
import UserWorkflows from './userWorkflows.js';
import UserJobs from './userJobs.js';
import Workflows from './workflows.js';
import WorkflowBuilder from './workflowBuilder.js';
import WorkflowLoader from './workflowLoader.js';
import WorkflowRunner from './workflowRunner.js';
import Help from './help.js';
import BSA from './bsa.js';

const AppsDetail=React.createClass({
	mixins: [Reflux.connect(AppsStore, 'appsStore')],

	componentDidMount: function() {
		AppsActions.setReload();
	},

	componentDidUpdate: function(prevProps, prevState) {
		AppsActions.setReload();
	},

	componentWillUnmount: function() {
		AppsActions.hideApp();
	},

	render: function() {
		let user=this.props.user;
		let appsStore=this.state.appsStore;
		let appDetail=appsStore.appDetail;
		let reload=appsStore.reload;
		let markup;
		if (appDetail && appDetail.id) {
			markup=(
				<div>
					<AppsForm appDetail={appDetail} reload={reload} user={this.props.user}/>
					<AppsInfo appDetail={appDetail} />
				</div>
			);
		} else {
			switch (appsStore.pageId) {
				case 'userJobs':
					markup=<UserJobs user={user} />
					break;
				case 'userWorkflows':
					markup=<UserWorkflows user={user} />
					break;
				case 'dataWorkflows':
          if (_config.data_item) {
            WorkflowActions.listWorkflow(_config.data_item);
          }
					markup=<UserWorkflows user={user} />
					break;
				case 'workflows':
					markup=<Workflows />
					break;
				case 'workflowBuilder':
					markup=<WorkflowBuilder user={user} />
					break;
				case 'workflowLoader':
					markup=<WorkflowLoader user={user} />
					break;
				case 'workflowRunner':
					markup=<WorkflowRunner user={user} />
					break;
				case 'welcome':
					markup=<Welcome />
					break;
				case 'help':
					markup=<Help />
					break;
				case 'bsa':
					markup=<BSA />
					break;
				default:
					markup=<div />
			}
		}
		return markup;
	}
});

module.exports = AppsDetail;
