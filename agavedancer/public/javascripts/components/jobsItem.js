'use strict';

import React from 'react';
import JobsActions from '../actions/jobsActions.js';
import {ListGroup, ListGroupItem, Button, ButtonToolbar, Panel} from 'react-bootstrap';

var Glyphicon = require('react-bootstrap').Glyphicon;

const JobsItem=React.createClass({
	getInitialState: function() {
		return {isOpen: false, checked: false};
	},

	showJob: function() {
		JobsActions.showJob(this.props.data.job_id);
	},

	showJobOutputs: function() {
		if (! this.state.isOpen) {
			JobsActions.showJobOutputs(this.props.data.job_id);
		}
		this.setState({ isOpen: !this.state.isOpen });
	},

	resubmitJob: function() {
		JobsActions.resubmitJob(this.props.data.job_id);
	},

	handleCheck: function() {
		this.setState({ checked: !this.state.checked });
	},

	render: function() {
		let appId=this.props.data.appId;
		let displayName=(this.props.index + 1) + ': ' + appId;
		let isSubmitting=undefined === this.props.data.job_id;
		let setting=this.props.setting;
		let outputs=this.props.outputs;
		let jobId=this.props.data.job_id;
		let outputsItemNodes='Loading ...';
		let checkedGlyph=this.state.checked ? 'ok-circle' : 'ban-circle';
		if (outputs && outputs.length) {
			outputsItemNodes=outputs.filter(function(item) {
				let name='job-for-' + appId.toLowerCase().replace(/\W+/g, '-');
				return item.name.includes(name) ? false : true;
			}).map(function(result, index) {
				//let href=setting.output_url + '/' + result.path;
				let href=setting.output_url[result.system] + '/' + result.path;
				return (
					<ListGroupItem key={index}><a href={href} target='_blank'>{result.name}</a></ListGroupItem>
				);
			});
		}

		return (
			<ListGroupItem>
		          <ButtonToolbar>
                            <Button key='outputs' bsSize='medium' bsStyle='link' disabled={isSubmitting} onClick={isSubmitting ? null : this.showJobOutputs} >{displayName}</Button>
                            <Button key='resubmit' bsSize='medium' bsStyle='link' disabled={isSubmitting} onClick={isSubmitting ? null : this.resubmitJob} ><Glyphicon glyph='repeat' /></Button>
                            <Button key='status' bsSize='medium' bsStyle='link' disabled={isSubmitting} onClick={isSubmitting ? null : this.showJob} ><Glyphicon glyph='info-sign' /></Button>
								<Button key='check' bsSize='medium' bsStyle='link' disabled={isSubmitting} onClick={isSubmitting ? null : this.handleCheck} ><Glyphicon glyph={checkedGlyph} /></Button>
			  </ButtonToolbar>
            		  <Panel collapsible expanded={this.state.isOpen}>
				<ListGroup>
					{outputsItemNodes}
				</ListGroup>
	        	  </Panel>
			</ListGroupItem>
		);
	}
});

module.exports= JobsItem;
