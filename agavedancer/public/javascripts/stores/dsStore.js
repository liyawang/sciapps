'use strict';

import Reflux from 'reflux';
import axios from 'axios';
import _ from 'lodash';
import Q from 'q';
import DsActions from  '../actions/dsActions.js';

axios.defaults.withCredentials = true;

const DsStore=Reflux.createStore({
	listenables: DsActions,

	init: function() {
		this._resetState();
	},

	getInitialState: function() {
		return this.state;
	},

	complete: function() {
		this.trigger(this.state);
	},

	resetState: function() {
		this._resetState();
		this.complete();
	},

	_resetState: function() {
		this.state={
			showDataStore: false,
			target: undefined,
			type: '__home__',
			dsDetail: {},
			dsDetailCache: {},
			dsItemPaths: {}
		};
	},

	refreshDataStore: function(showPath) {
		let path=showPath;
		if (path === undefined) {
			path=this.state.dsDetail.path || '';
		}
		this.state.dsDetailCache={};
		this.state.dsDetail={};
		this.showDataStore(path);
	},

  /*
  ### Description
  setup datastore data and show datastore modal
  */
	showDataStore: function(showPath) {
		let setting=_config.setting;
		let path=showPath, type=this.state.type;
		if (! path) {
			if (path === undefined) {
				if (typeof this.state.dsDetail !== 'undefined') {
					path=this.state.dsDetail.path || '';
				} else {
					path='';
				}
			}
		} else {
			if (path.endsWith('/')) {
				path=path.slice(0,-1);
			}
			if ('..' === path) {
				path=this.state.dsDetail.path.replace(/(\/|^)[^\/]+$/, '');
			} else {
				if (this.state.dsDetail.path) {
					path=this.state.dsDetail.path + '/' + path;
				}
			}
		}
		//if (! path.startsWith('/')) {
		//	path='/' + path;
		//}

		//if (! this.state.showDataStore || cachedPath) {
		//	this.state.showDataStore=true;
		//	this.complete();
		//}
		if (! this.state.showDataStore) {
			this.state.showDataStore=true;
			this.complete();
		}
		let dataStorePromise=this.setDataStore(type, path);
		dataStorePromise.then(function(dsDetail) {
			this.state.dsDetail=dsDetail;;
			this.complete();
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		})
		.done();
	},

  /*
  ### Description
  call web api to retrieve user datastore data aynchronously
  */
	setDataStore: function(type, path) {
		let setting=_config.setting;
		let cachedPath=_.get(this.state.dsDetailCache, [type, path]);
		let dataStorePromise;
		let typePath=type + '/' + path;
		if (cachedPath) {
			dataStorePromise=Q(cachedPath);
		} else {
			//dataStorePromise=Q(axios.get(setting.host_url + '/browse/' + typePath, {
			dataStorePromise=Q(axios.get('/browse/' + typePath, {
				headers: {'X-Requested-With': 'XMLHttpRequest'},
			}))
			.then(function(res) {
				if (res.data.error) {
					console.log(res.data.error);
					return;
				} else {
					let data=res.data.data;
					res.data.data.forEach(function(dsDetail) {
						let filtered=dsDetail.list.filter(function(item) {
							return ! item.name.startsWith('.');
						});
						//if (! dsDetail.is_root) {
						//  dsDetail.list.unshift({name: '..', type: 'dir'});
						//}
						_.set(this.state.dsDetailCache, [type, dsDetail.path], dsDetail);
					}.bind(this));
					return _.get(this.state.dsDetailCache, [type, path]);
				}
			}.bind(this))
			.catch(function(res) {
				console.log(res);
			})
		}
		return dataStorePromise;
	},

  /*
  ### Description
  hide datastore modal
  */
	hideDataStore: function() {
		if (this.state.showDataStore) {
			this.state.showDataStore=false;
			this.complete();
		}
	},

  /*
  ### Description
  set the input for take datastore item when selected
  */
	setDataStoreItemTarget: function(target) {
		if (target !== this.state.target) {
			this.state.target=target;
			this.clearDataStoreItem(target);
		}
	},

  /*
  ### Description
  assign the item to the target input
  */
	selectDataStoreItem: function(item) {
		let setting=_config.setting;
		if (item) {
			let currPath=this.state.dsItemPaths[this.state.target];
			if (currPath && currPath.type === this.state.type && currPath.path === this.state.dsDetail.path && currPath.name === item) {
				this.state.dsItemPaths[this.state.target]='';
			} else {
				this.state.dsItemPaths[this.state.target]={type: this.state.type, path: this.state.dsDetail.path, name: item};
			}
		} else {
			this.state.dsItemPaths[this.state.target]='';
		}
		this.complete();
	},

  /*
  ### Description
  clear target input
  */
	clearDataStoreItem: function(target) {
		if (target) {
			delete this.state.dsItemPaths[target];
		} else {
			this.state.showDataStore=false;
			this.state.target=undefined;
			this.state.dsItemPaths={};
		}
		this.complete();
	},

	changeSource: function(source) {
		this.state.type=source;
		this.showDataStore('');
	}
});

module.exports = DsStore;
