'use strict';

import React from 'react';
import Reflux from 'reflux';
import AppsStore from '../stores/appsStore.js';
import JobsStore from '../stores/jobsStore.js';
import AppsActions from '../actions/appsActions.js';
import dsActions from '../actions/dsActions.js';
import WorkflowActions from '../actions/workflowActions.js';
import {Panel, Table, Jumbotron} from 'react-bootstrap';
import AppsInfo from './appsInfo.js';
import AppsForm from './appsForm.js';
import Welcome from './welcome.js';
import Workflows from './workflows.js';
import WorkflowBuilder from './workflowBuilder.js';
import WorkflowRunner from './workflowRunner.js';
import Visual from './visual.js';

const AppsDetail=React.createClass({
	mixins: [Reflux.connect(AppsStore, 'appsStore'), Reflux.connect(JobsStore, 'jobsStore')],

	componentDidUpdate: function(prevProps, prevState) {
		dsActions.resetDsDetail();
	},

	render: function() {
		let appsStore=this.state.appsStore;
		let appDetail=appsStore.appDetail;
		let jobsStore=this.state.jobsStore;
		let jobDetail=jobsStore.jobDetail;
		let markup;
		if (appDetail.id) {
			markup=(
				<div>
					<AppsForm appId={appDetail.id} jobId={jobDetail.job_id} resubmit={jobsStore.resubmit} />
					<AppsInfo appId={appDetail.id} />
				</div>
			);
		} else {
			switch (appsStore.pageId) {
				case 'workflows':
					markup=<Workflows />
					break;
				case 'workflowBuilder':
					markup=<WorkflowBuilder />
					break;
				case 'workflowRunner':
					markup=<WorkflowRunner />
					break;
				case 'welcome':
					markup=<Welcome />
					break;
				case 'visual':
					markup=<Visual />
					break;
				default:
					markup=<div />
			}
		}
		return markup;
	}
});

module.exports = AppsDetail;
