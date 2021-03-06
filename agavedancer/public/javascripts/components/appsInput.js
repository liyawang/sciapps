'use strict';

import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import AppsActions from '../actions/appsActions.js';
import DsActions from '../actions/dsActions.js';
import DsStore from '../stores/dsStore.js';
import {Input, Button, ButtonGroup, Alert, Glyphicon} from 'react-bootstrap';
import utilities from '../libs/utilities.js';
import Dialog from 'react-bootstrap-dialog';

const AppsInput=React.createClass({
	mixins: [Reflux.listenTo(DsStore, 'handleDsStoreChange')],

	getInitialState: function() {
		let value=[], count=1, active=0;
		let reload=this.props.reload;
		let dataValue;
		if (reload === 'resubmit' || this.props.data.value.value !== undefined) {
			dataValue=this.props.data.value.value;
		} else {
			dataValue=this.props.data.value.default;
		}
		if (undefined !== dataValue) {
			if (_.isArray(dataValue)) {
				value=dataValue;
				count=dataValue.length;
			} else {
				value[0]=dataValue;
				count=1;
			}
		}
		return {
			active: active,
			count: count,
			value: value
		};
	},

  /*
  ### Description
  fill the value according to reload property; if it is 'resubmit', using job value; if it is 'default', using default value
  */
	componentWillReceiveProps: function(nextProps) {
		//let reload=this.props.reload;
		let reload=nextProps.reload;
		let value=[], count=1;
		let dataValue;
		if (reload === 'resubmit') {
			dataValue=nextProps.data.value.value;
		} else if (reload === 'default') {
			dataValue=nextProps.data.value.default;
		}
		if (undefined !== dataValue) {
			if (_.isArray(dataValue)) {
				value=dataValue;
				count=dataValue.length;
			} else {
				value[0]=dataValue;
				count=1;
			}
			this.setState({count: count, value: value});
		}
	},

	componentWillUnmount: function() {
		this.setState({count: 1, value: this.props.data.value.default});
	},

  /*
  ### Description
  handling select item in datastore and set value
  */
	handleDsStoreChange: function(dsStore) {
		let setting=_config.setting;
		let dsItemUrl;
		let dsItemPath=dsStore.dsItemPaths[this.props.data.id + '_' + this.state.active];
		if (dsItemPath) {
			let datastore=setting.datastore[dsItemPath.type];
			dsItemUrl='agave://' + [datastore.system, datastore.path, (dsItemPath.path ? dsItemPath.path + '/' : '') + dsItemPath.name].join('/');
		} else if (dsItemPath === '') {
			dsItemUrl='';
		}
		//if (dsItemUrl && dsItemUrl !== this.state.value) {
		if (dsItemUrl !== undefined && dsItemUrl !== this.state.value) {
			let value=this.state.value;
			value[this.state.active]=dsItemUrl;
			this.setState({
				value: value
			});
		}
	},

  /*
  ### Description
  handling text input and set value
  */
	handleTextChange: function(event) {
		let match=event.target.id.match(/_(\d+)$/);
		let value=this.state.value;
		if (match !== null) {
			value[match[1]]=event.target.value;
			this.setState({value: value});
		}
	},

  /*
  ### Description
  handling open datastore modal and setup target for datastore
  */
	handleDataStore: function(event) {
		let match=event.target.id.match(/^btn_(.*_(\d+))$/);
		if (match !== null) {	
				DsActions.setDataStoreItemTarget(match[1]);
				DsActions.showDataStore();
				this.setState({active: match[2]});
		}
	},

  /*
  ### Description
  adding more input widget for multiple value inputs
  */
	handleInsertInput: function(event) {
		if (this.state.count < this.props.data.semantics.maxCardinality) {
			this.setState({count: this.state.count + 1});
		}
	},

  /*
  ### Description
  remove input widget for multiple value inputs
  */
	handleRemoveInput: function(event) {
		if (this.state.count > 1) {
			this.setState({count: this.state.count - 1});
		}
	},

  /*
  ### Description
  validate requirement fulfilled or setup warning
  */
	validateState: function() {
		if (this.props.data.value.required && ! this.state.value.length) return 'warning';
		else return undefined;
	},

  /*
  ### Description
  build input widget
  */
	buildAgaveAppsInput: function() {
		let setting=_config.setting;
		let data=this.props.data;
		let prefix=data.value.required ? '*' : '';
		let suffix=setting['upload_suffix'] || '.upload';
		let markup;
		if (data.value.visible === false) {
			let props={
				key: data.id,
				name: data.id,
				value: this.state.value
			};
			markup=(<Input {...props} />);
		} else {
			let props={
				label: prefix + data.details.label,
				help: data.details.description,
				bsStyle: this.props.onValidate ? this.validateState() : undefined,
				wrapperClassName: 'wrapper'
			};
			let textProps={
				name: data.id,
				type: 'text',
				placeholder: 'or Enter a URL',
				className: 'form-control',
				onChange: this.handleTextChange
			};
			let inputs=[];
			let user=this.props.user;
			for (let i=0; i < this.state.count; i++) {
				textProps.id=data.id + '_' + i;
				textProps.key=data.id + '_' + i;
				textProps.value=this.state.value[i];
				textProps.buttonBefore=<Button id={'btn_' + data.id + '_' + i} onClick={this.handleDataStore} bsStyle={this.props.onValidate ? this.validateState() : 'default'} >Browse DataStore</Button>;
				inputs[i]=<Input {...textProps} />;
			}

			let insertButton=this.state.count < data.semantics.maxCardinality ? <Button bsStyle='info' onClick={this.handleInsertInput}><Glyphicon glyph='plus' /> Insert</Button> : undefined;
			let removeButton=this.state.count > 1 ? <Button bsStyle='info' onClick={this.handleRemoveInput}><Glyphicon glyph='minus' /> Remove</Button> : undefined;
			markup=(
				<div>
					<Input {...props}>{inputs}</Input>
					{insertButton}{removeButton}
					<Dialog ref='dialog' />
				</div>
			);
		}
		return markup;
	},

	render: function() {
		let markup=this.buildAgaveAppsInput();
		return markup;
	}
});

module.exports = AppsInput;
