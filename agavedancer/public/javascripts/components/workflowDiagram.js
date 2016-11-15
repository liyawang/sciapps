'use strict';

import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import AppsStore from '../stores/appsStore.js';
import JobsStore from '../stores/jobsStore.js';
import WorkflowStore from '../stores/workflowStore.js';
import JobsActions from '../actions/jobsActions.js';
import WorkflowActions from '../actions/workflowActions.js';
import {Modal, Button} from 'react-bootstrap';
import Mermaid from './mermaid.js';
import FilesInfo from './filesInfo.js';

const WorkflowDiagram=React.createClass({
	mixins: [Reflux.connect(WorkflowStore, 'workflowStore'), Reflux.connect(JobsStore, 'jobsStore'), Reflux.connect(AppsStore, 'appsStore')],

	getDefaultProps: function() {
		return {
			timeout: 10000 
		};
	},

	getInitialState: function() {
		return {
			setting: _config.setting
		}
	},

	componentWillMount: function() {
		window.clickNode=function(id) {
			let clickNodeFunc=this.clickNodeFuncMap(id);
			if (typeof clickNodeFunc === 'function') {
				clickNodeFunc(id);
			} else {
				console.log(id);
			}
		}.bind(this);
	},

	clickNodeFuncMap: function(id) {
		let func=function() {
			let input=this.state.jobsStore.inputs[id];
			JobsActions.showFile(id);
			console.log(id);
			console.log(input);
		}.bind(this);
		return func;
	},

	hideWorkflowDiagram: function() {
		WorkflowActions.hideWorkflowDiagram();
	},

	buildWorkflowDiagramDef: function(workflowStore, appsStore, jobsStore) {
		let that=this;
		let setting=this.state.setting;
		let jobs=jobsStore.workflow.jobs;
		let jobStatus=jobsStore.jobStatus;
		let def;
		if (workflowStore.workflowDetail) {
			let steps=workflowStore.workflowDetail.steps;
			let diagramDefStmts=['graph LR'];
			steps.map(function(step, i) {
				let showAppId=step.appId.replace(/\-[\.\d]+$/, '');
				let appClass='PENDING';
				if (typeof jobs === 'object' && jobs[i] !== 'undefined' && jobStatus[jobs[i]] !== 'undefined') {
					appClass=jobStatus[jobs[i]];
				}
				diagramDefStmts.push(step.id + '[' + showAppId + ']; class ' + step.id + ' appsNode' + appClass);
				let appId=step.appId;
				let appDetail=appsStore.appDetailCache[appId];
				_.forEach(appDetail.outputs, function(v) {
					let value=v.value.default;
					let output_name=(setting.wf_step_prefix + step.id + ':' + value).replace(/\W/g, '_').toLowerCase();
					diagramDefStmts.push(output_name + '(' + value + '); class ' + output_name + ' fileNode');
					diagramDefStmts.push('click ' + output_name + ' clickNode');
					diagramDefStmts.push(step.id + '-->' + output_name);
				});
				_.forEach(appDetail.inputs, function(v) {
					let value=v.value.default;
					let ic=step.inputs[v.id];
					if (_.isPlainObject(ic)) {
						value=(setting.wf_step_prefix + ic.step + ':' + ic.output_name).replace(/\W/g, '_').toLowerCase();
						diagramDefStmts.push(value + '(' + ic.output_name + '); class ' + value + ' fileNode');
						diagramDefStmts.push('click ' + value + ' clickNode');
						diagramDefStmts.push(ic.step + '-->' + value);
						diagramDefStmts.push(value + '-->' + step.id);
					} else if (ic) {
						value=_.last(ic.split('/'));
						let input_name=value.replace(/\W/g, '_').toLowerCase();
						diagramDefStmts.push(input_name + '(' + value + '); class ' + input_name + ' fileNode');
						diagramDefStmts.push('click ' + input_name + ' clickNode');
						diagramDefStmts.push(input_name + '-->' + step.id);
						JobsActions.setWorkflowInputs(input_name, ic);
					}
				});
			});
			def=_.uniq(diagramDefStmts).join(';\n');
		}
		return def;
	},

	render: function() {
		let showWorkflowDiagram=this.state.workflowStore.showWorkflowDiagram;
		let jobsStore=this.state.jobsStore;
		let workflow=jobsStore.workflow;
		let fileId=jobsStore.fileId;
		let jobStatus=jobsStore.jobStatus;
		let body=<div />;
		let filesInfo=<div />;
		if (showWorkflowDiagram) {
			let workflowDiagramDef=this.buildWorkflowDiagramDef(this.state.workflowStore, this.state.appsStore, this.state.jobsStore);
			body=<Mermaid diagramDef={workflowDiagramDef}/>;
			if (typeof workflow.jobs === 'object') {
				let unfinished=_.findIndex(workflow.jobs, function(j) {
					return jobStatus[j] !== 'FINISHED';
				});
				if (unfinished !== -1) {
					setTimeout((wfId) => JobsActions.checkWorkflowJobStatus(wfId), this.props.timeout, workflow.id); 
				}
			}
		}
		if (fileId !== undefined) {
			filesInfo=<FilesInfo fileId={fileId} />;
		}

		return (
			<Modal bsSize="large" show={showWorkflowDiagram} onHide={this.hideWorkflowDiagram}>
				<Modal.Header closeButton>
					<Modal.Title>Workflow Diagram</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{body}
					{filesInfo}
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={this.hideWorkflowDiagram}>Close</Button>
				</Modal.Footer>
			</Modal>
		);
	}
});

module.exports= WorkflowDiagram;
