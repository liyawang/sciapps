'use strict';

import Reflux from 'reflux';
import axios from 'axios';
import _ from 'lodash';
import Q from 'q';
import JobsActions from  '../actions/jobsActions.js';
import AppsActions from  '../actions/appsActions.js';

const JobsStore=Reflux.createStore({
	listenables: JobsActions,

	init: function() {
		this.state={
			setting: _config.setting,
			resubmit: false,
			showJob: false,
			jobs: [],
			jobDetail: {},
			jobStatus: {},
			jobOutputs: {},
			jobDetailCache: {},
			wid: {},
			workflow_id: {}
		};
	},

	getInitialState: function() {
		return this.state;
	},

	complete: function() {
		this.trigger(this.state);
	},

	submitWorkflowJobs: function(wf, formData) {
		let submitNumber=this.state.jobs.length;
		let setting=this.state.setting;
		wf.steps.map(function(step, i) {
			this.state.jobs[submitNumber + i]={appId: step.appId};
		}.bind(this));
		this.complete();
		Q(axios.post(setting.host_url + '/workflow/new', formData, {
			headers: {'X-Requested-With': 'XMLHttpRequest'},
			transformRequest: function(data) { return data; }
		}))
		.then(function(res) {
			let jobs=[];
			wf.steps.map(function(step, i) {
				let index=submitNumber + i;
				this.state.jobs[index]=res.data.jobs[i];
				jobs[i]=res.data.jobs[i].job_id;
			}.bind(this));
			this.state.workflow_id[res.data.workflow_id]=jobs;
			this.complete();
		}.bind(this))
		.catch(function(error) {
				console.log(error);
		})
		.done();
	},

	submitJob: function(appId, formData) {
		let submitNumber=this.state.jobs.length;
		let setting=this.state.setting;
		this.state.jobs[submitNumber]={appId: appId};
		this.complete();
		Q(axios.post(setting.host_url + '/job/new/' + appId , formData, {
			headers: {'X-Requested-With': 'XMLHttpRequest'},
			transformRequest: function(data) { return data; }
		}))
		.then(function(res) {
			this.state.jobs[submitNumber]=res.data;
			this.complete();
		}.bind(this))
		.catch(function(error) {
				console.log(error);
		})
		.done();
	},

	setJobs: function(jobIds) {
		let submitNumber=this.state.jobs.length;
		Q.all(jobIds.map(this.setJob)).done(function(jobs) {
			_.forEach(jobs, function(job) {
				this.state.jobs[submitNumber++]=this.state.jobDetailCache[job.id];
			}.bind(this));
			this.complete();
		}.bind(this));
	},

	setWorkflowJobs: function(jobIds, wid) {
		Q.all(jobIds.map(this.setJob)).done(function(jobs) {
			if (wid !== undefined) {
				this.state.wid[wid]=true;
			}
			this.complete();
		}.bind(this));
	},

	resetWorkflowJobs: function(wid) {
		delete this.state.wid[wid];
	},

	setJob: function(jobId) {
		let jobDetail=this.state.jobDetailCache[jobId];
		let setting=this.state.setting;
		let jobPromise;
		if (jobDetail) {
			jobPromise=Q(jobDetail);
		} else {
			jobPromise=Q(axios.get(setting.host_url + '/job/' + jobId, {
				headers: {'X-Requested-With': 'XMLHttpRequest'},
			}))
			.then(function(res) {
				this.state.jobDetail=res.data;
				if(_.includes(['FINISHED','FAILED'], res.data.status)) {
					this.state.jobDetailCache[res.data.job_id]=res.data;
				}
				return res.data;
			}.bind(this));
		}
		return jobPromise;
	},

	showJob: function(jobId) {
		if (! this.state.showJob) {
			this.state.showJob=true;
			this.complete();
		}
		let jobPromise=this.setJob(jobId);
		jobPromise.then(function(jobDetail) {
			this.state.jobDetail=jobDetail;
			this.complete();
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		})
		.done();
	},

	hideJob: function() {
		if (this.state.showJob) {
			this.state.jobDetail={};
			this.state.showJob=false;
			this.complete();
		}
	},

	setWorkflowJobOutputs: function(jobIds, wid) {
		Q.all(jobIds.map(this.setJobOutputs)).done(function(jobOutputs) {
			if (wid !== undefined) {
				this.state.wid[wid]=true;
			}
			this.complete();
		}.bind(this));
	},

	setJobOutputs: function(jobId) {
		let jobOutputs=this.state.jobOutputs[jobId];
		let setting=_config.setting;
		let jobOutputsPromise;
		if (jobOutputs) {
			jobOutputsPromise=Q(jobOutputs);
		} else {
			let jobPromise=this.setJob(jobId);
			jobOutputsPromise=jobPromise.then(function(jobDetail) {
				let path='system/' + jobDetail.archiveSystem + '/' + jobDetail.archivePath;
				return Q(axios.get(setting.host_url + '/browse/' + path, {
					headers: {'X-Requested-With': 'XMLHttpRequest'},
				}))
			})
			.then(function(res) {
				let results=res.data[0].list.filter(function(result) {
					return ! result.name.startsWith('.');
				});
				for (let r of results) {
					r.path=r.path.replace(setting.archive_home + '/', '');
				}
				return results;
			})
			.then(function(results) {
				this.state.jobOutputs[jobId]=results;
				return results;
			}.bind(this));
		}
		return jobOutputsPromise;
	},

	showJobOutputs: function(jobId) {
		let jobOutputsPromise=this.setJobOutputs(jobId);
		jobOutputsPromise.then(function() {
			this.complete();
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		})
		.done();
	},

	checkJobStatus: function(jobId) {
		let setting=this.state.setting;
		let jobStatusPromise=Q(axios.get(setting.host_url + '/job/status/' + jobId, {
			headers: {'X-Requested-With': 'XMLHttpRequest'},
		}))
		.then(function(res) {
			this.state.jobStatus[jobId]=res.data;
			this.complete();
			return res.data;
		}.bind(this));
		return jobStatusPromise;
	},

	resubmitJob: function(jobId) {
		this.state.resubmit=true;
		let jobPromise=this.setJob(jobId);
		jobPromise.then(function(jobDetail) {
			this.state.jobDetail=jobDetail;
			AppsActions.showAppByJob(this.state);
			this.complete();
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		})
		.done();
	},

	resetResubmit: function() {
		this.state.resubmit=false;
		this.complete();
	}
});

module.exports = JobsStore;
