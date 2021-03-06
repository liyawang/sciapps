'use strict';

import React from 'react';
import Reflux from 'reflux';
import AppsFieldset from './appsFieldset.js';
import BaseInput from './baseInput.js';
import AppsStore from '../stores/appsStore.js';
import WorkflowStore from '../stores/workflowStore.js';
import AppsActions from '../actions/appsActions.js';
import JobsActions from '../actions/jobsActions.js';
import dsActions from '../actions/dsActions.js';
import WorkflowActions from '../actions/workflowActions.js';
import _ from 'lodash';
import Q from 'q';
import utilities from '../libs/utilities.js';
import {Panel, Button, ButtonToolbar, Alert, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Dialog from 'react-bootstrap-dialog';

const WorkflowRunnerForm=React.createClass({
	mixins: [Reflux.connect(AppsStore, 'appsStore'), Reflux.connect(WorkflowStore, 'workflowStore')],

	getInitialState: function() {
		return {
			onSubmit: false,
			onValidate: false,
			required: {}
		}
	},

	componentWillReceiveProps: function(nextProps) {
		this.setState({
			onSubmit: false,
			onValidate: false
		});
	},

	componentWillUnmount: function() {
		WorkflowActions.hideWorkflow();
		AppsActions.resetWorkflowApps();
	},

	formName: 'workflowRunnerForm',

  /*
  ### Description
  handling workflow submission and showing workflow diagram 
  */
	handleSubmit: function(event) {
		dsActions.clearDataStoreItem();
		this.setState({onSubmit: true, onValidate: true});
		let wf=this.state.workflowStore.workflowDetail;
		let setting=_config.setting;
		let required=_.keys(this.state.required);
		let form=this.refs[this.formName];
		let validated=utilities.validateForm(form, required, setting.upload_suffix);
		let confirmed;
		if (validated) {
			let formData=new FormData(form);
			let wid=utilities.uuid();
			//let wf=JSON.parse(formData.get('_workflow_json'));
			formData.set('_workflow_id', wid);
			formData.set('workflow_name', 'workflow-' + wid + '-' + wf.name);
			formData.set('_workflow_json', JSON.stringify(wf));
			//confirmed=confirm('You are going to submit ' + wf.steps.length + ' jobs to cluster, are you sure?');
			this.refs.dialog.show({
				body: 'Confirm you want to submit these ' + wf.steps.length + ' jobs?\n-------------------------------------------------\nA "sci_data" folder is needed for archiving results (e.g. /iplant/home/USER/sci_data)',
				actions: [
					Dialog.CancelAction(),
					Dialog.Action(
						'Submit',
						() => {
							WorkflowActions.submitWorkflow(formData);
							this.setState({onSubmit: false});
							Q.delay(1000).then(function() {
								this.refs.dialog.show({
									body: 'Submitted! Check History panel for status',
									actions: [
										Dialog.OKAction(() => {
											this.showWorkflowDiagram(true, true);
										})
									]
								})
							}.bind(this))
						},
						'btn-danger'
					)
				]
			});
		} else {
			//alert('There is something missing in your job submission form.');
			this.refs.dialog.showAlert('There is something missing in your submission form.');
		}

		//if (confirmed) {
		//	WorkflowActions.submitWorkflow(formData);
		//	this.setState({onSubmit: false});
		//}

		Q.delay(1000).then(function() {
			//if (confirmed) {
			//	alert('Workflow has been submitted.');
			//	this.showWorkflowDiagram();
			//}
			this.setState({onSubmit: false});
		}.bind(this));
		//setTimeout(() => {
		//	this.setState({onSubmit: false});
		//}, 1500);
	},

	handleSubmitPrepare: function() {
		this.setState({onSubmit: true, onValidate: true});
	},

	handleSubmitDismiss: function() {
		this.setState({onSubmit: false, onValidate: false});
	},

  /*
  ### Description
  showing workflow diagram
  */
	showWorkflowDiagram: function(noJobList, noJSON) {
    let wf=this.state.workflowStore.workflowDetail;
		WorkflowActions.showWorkflowDiagram(wf.workflow_id, wf, noJobList, noJSON);
	},

  /*
  ### Description
  showing workflow metadata
  */
	showWorkflowMetadata: function() {
    let wf=this.state.workflowStore.workflowDetail;
    if (wf && wf.metadata_id) {
		  WorkflowActions.showWorkflowMetadata(wf.workflow_id);
    }
	},

	render: function() {
		let user=this.props.user;
		let workflowStore=this.state.workflowStore;
		let appsStore=this.state.appsStore;
		let setting=_config.setting;
		let markup=<div />, appsFieldsets;
		let onSubmit=this.state.onSubmit, onValidate=this.state.onValidate;
		let required=this.state.required={};
		if (workflowStore.workflowDetail) {
			let workflowDetail=workflowStore.workflowDetail;
			let steps=workflowDetail.steps;
			appsFieldsets=steps.map(function(step) {
				let showAppId=step.appId.replace(/\-[\.\d]+$/, '');
				let appId=step.appId;
				let appDetail=_.cloneDeep(appsStore.appDetailCache[appId]);
				if (undefined === appDetail) {
					return;
				}
				_.forEach(appDetail.inputs, function(v) {
					let inputs=step.inputs[v.id] || [];
					if (! _.isArray(inputs)) {
						inputs=[inputs];
						v.value.default=[];
					} else if (inputs.length) {
						v.value.default=[];
					}
					inputs.forEach(function (ic) {
						if (_.isPlainObject(ic)) {
							//v.value.default.push((setting.wf_step_prefix + ic.step + ':' + ic.output_name).toLowerCase());
							v.value.default.push(setting.wf_step_prefix + ic.step + ':' + ic.output_name);
						} else if (ic) {
							v.value.default.push(ic);
						}
					});
					v.id=setting.wf_step_prefix + step.id + ':' + v.id;
					if (v.value.required) {
						required[v.id]=1;
					}
				});
				_.forEach(appDetail.parameters, function(v) {
					let p=step.parameters[v.id];
					if (p !== undefined) {
						v.value.default=p;
					}
					v.id=setting.wf_step_prefix + step.id + ':' + v.id;
					if (v.value.required) {
						required[v.id]=1;
					}
				});
				return <AppsFieldset key={step.id} appDetail={appDetail} index={step.id} onValidate={onValidate} />;
			});
			let emailInput={
				type: 'email',
				required: false,
				key: '_email',
				id: '_email',
				name: '_email',
				label: 'Email',
				help: 'Optional Email notification upon job completion'
			};

			let tooltipsubmit = <Tooltip id="tooltisubmit">Please log in to submit job</Tooltip>;
			let submitBtn=user.authenticated ? <Button bsStyle='primary' onClick={this.handleSubmit}>Submit</Button> : 
				<OverlayTrigger placement="bottom" overlay={tooltipsubmit}>
					<Button bsStyle='primary' onClick={null}>Submit Jobs</Button>
				</OverlayTrigger>;
			markup=(
				<div>
					<form ref={this.formName} >
						{appsFieldsets}
						{submitBtn}
						<span> </span>
						<Button bsStyle='primary' onClick={this.showWorkflowDiagram}>Diagram</Button>
						<span> </span>
						<Button bsStyle='primary' onClick={this.showWorkflowMetadata}>Metadata</Button>
					</form>
					<Dialog ref='dialog' />
				</div>
			);
		}
		return markup;
	}
});

module.exports = WorkflowRunnerForm;
