'use strict';

import React from 'react';
import Reflux from 'reflux';
import {Modal, Button} from 'react-bootstrap';
import BaseInput from './baseInput.js';
import UserStore from '../stores/userStore.js';
import UserActions from  '../actions/userActions.js';

const UserLoginBox=React.createClass({
	mixins: [Reflux.connect(UserStore, 'userStore')],

	formName: 'userLoginForm',

	hideLoginBox: function() {
		UserActions.hideLoginBox();
	},

	handleLogin: function() {
		let formData=new FormData(this.refs[this.formName]);
		UserActions.login(formData);
	},

	render: function() {
		let showLoginBox=this.state.userStore.showLoginBox;
		let usernameInput={
			type: 'text',
			name: 'username',
			label: 'Username'
		};
		let passwordInput={
			type: 'password',
			name: 'password',
			label: 'Password'
		};
		return(
			<Modal show={showLoginBox} onHide={this.hideLoginBox}>
				<Modal.Header closeButton>
					<Modal.Title>User Login</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<form ref={this.formName}>
						<BaseInput data={usernameInput} />
						<BaseInput data={passwordInput} />
					</form>
				</Modal.Body>
				<Modal.Footer>
					<Button bsStyle='primary' onClick={this.handleLogin}>Login</Button>
					<Button bsStyle='primary' onClick={this.hideLoginBox}>Cancel</Button>
				</Modal.Footer>
			</Modal>
		);
	}
});

module.exports = UserLoginBox;
