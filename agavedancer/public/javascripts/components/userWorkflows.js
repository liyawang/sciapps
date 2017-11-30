'use strict';

import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import {Panel, Table, Button, ButtonToolbar, ButtonGroup, Tooltip, OverlayTrigger, Glyphicon} from 'react-bootstrap';
import WorkflowStore from '../stores/workflowStore.js';
import WorkflowActions from '../actions/workflowActions.js';
import AppsActions from '../actions/appsActions.js';
import Dialog from 'react-bootstrap-dialog';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import utilities from '../libs/utilities.js';

const UserWorkflows=React.createClass({
	mixins: [Reflux.connect(WorkflowStore, 'workflowStore')],

	handleLoad: function(e) {
		let table=this.refs.table;
		let wfid=table.store.selected[0];
		if (wfid) {
			let wf=_.find(this.state.workflowStore.workflows, {workflow_id: wfid});
			let wfDetail=wf.json ? JSON.parse(wf.json) : undefined;
			AppsActions.showPage('workflowRunner');
			WorkflowActions.showWorkflow(wfid, wfDetail);
		}
	},

	handleDeleteRow: function(e) {
		let table=this.refs.table;
		let wfid=table.store.selected[0];
		if (wfid) {
			this.handleConfirmDeleteRow(function() {
				WorkflowActions.deleteWorkflow(wfid);
			});
		}
	},

	handleConfirmDeleteRow: function(next) {
		this.refs.dialog.show({
			body: 'Are you sure you want to delete this workflow?',
			actions: [
				Dialog.CancelAction(),
				Dialog.OKAction(
					() => {
						next();
					},
					'btn-warning'
				),
			]
		})
	},

	handleDownload: function(e) {
		let table=this.refs.table;
		let wfid=table.store.selected[0];
		if (wfid) {
			let wf=_.find(this.state.workflowStore.workflows, {workflow_id: wfid});
			utilities.download(wf.name + '.json', 'application/json;charset=utf-8', wf.json);
		}
	},

	handleCellSave: function(row, cellName, cellValue) {
		let formData={id: row.workflow_id, name: row.name, description: row.description};
		WorkflowActions.updateWorkflow(formData);
	},

	actionsFormatter: function(cell, row) {
		return cell;
	},

	createCustomButtonGroup: function(props) {
		let tooltipload=<Tooltip id="tooltipload">Load</Tooltip>;
		let tooltipdownload=<Tooltip id="tooltipdownload">Download</Tooltip>;
		let tooltipdelete=<Tooltip id="tooltipdelete">Delete</Tooltip>;
		return (
			<ButtonGroup>
				<Button key='load' bsStyle='success' onClick={this.handleLoad}><Glyphicon glyph='repeat'/> Load</Button>
				<Button key='download' bsStyle='info' onClick={this.handleDownload}><Glyphicon glyph='download-alt'/> Download</Button>
				<Button key='delete' bsStyle='warning' onClick={this.handleDeleteRow}><Glyphicon glyph='trash'/> Delete</Button>
			</ButtonGroup>
		);
	},

	render: function() {
		let workflowStore=this.state.workflowStore;
		let workflowItems;
		if (workflowStore.workflows.length) {
			workflowItems=workflowStore.workflows.map(function(workflow, i) {
				let item=_.pick(workflow, ['workflow_id', 'name', 'description']);
				return item;
			}.bind(this));
		}

		let cellEditProp={
			mode: 'dbclick',
			blurToSave: true,
			afterSaveCell: this.handleCellSave
		};
		let selectRowProp={
			mode: 'radio'
		};
		let options={
			btnGroup: this.createCustomButtonGroup
		};
		return (
			<Panel header="My Workflows">
				<BootstrapTable ref='table' data={workflowItems} search={true} striped={true} hover={true} cellEdit={cellEditProp} pagination={true} selectRow={selectRowProp} options={options}>
					<TableHeaderColumn isKey={true} dataField="workflow_id" hidden={true}>ID</TableHeaderColumn>
					<TableHeaderColumn dataField="name" dataAlign="left" width='250' dataSort={true}>Name</TableHeaderColumn>
					<TableHeaderColumn dataField="description" dataAlign="left">Description</TableHeaderColumn>
				</BootstrapTable>
				<Dialog ref='dialog' />
			</Panel>
		);
	}
});

module.exports = UserWorkflows;
