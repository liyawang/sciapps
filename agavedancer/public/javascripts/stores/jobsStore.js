'use strict';

import Reflux from 'reflux';
import axios from 'axios';
import _ from 'lodash';
import Q from 'q';
import JobsActions from  '../actions/jobsActions.js';
import AppsActions from  '../actions/appsActions.js';
import WorkflowActions from  '../actions/workflowActions.js';

axios.defaults.withCredentials = true;

const JobsStore=Reflux.createStore({
	listenables: JobsActions,

	init: function() {
		this._resetState();
		this.debouncedCheckWorkflowJobStatus=_.debounce((wfId) => { this.checkWorkflowJobStatus(wfId) }, 2000);
	},

	getInitialState: function() {
		return this.state;
	},

	complete: function() {
		this.trigger(this.state);
	},

	_resetState: function() {
		this.state={
			showJob: false,
			showJobId: undefined,
			jobs: [],
			joblist: [],
			workflowBuilderJobIndex: [],
			jobDetail: {},
			jobOutputs: {},
			jobOutputsStaged: {},
			jobDetailCache: {},
			wid: {},
			fileDetailCache: {},
			workflow: {}
		};
	},

	resetState: function() {
		this._resetState();
		this.complete();
	},

  /*
  ### Description
  call web api to retrieve job list asynchronously and return job list json
  */

	listJob: function() {
		let setting=_config.setting;
		Q(axios.get('/job', {
			headers: {'X-Requested-With': 'XMLHttpRequest'},
		}))
		.then(function(res) {
			if (res.data.error) {
				console.log(res.data.error);
				return;
			} else {
				this.state.joblist=res.data.data;
				this.complete();
				return res.data.data;
			}
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		})
		.done();
	},

  /*
  ### Description
  call web api to delete job asynchronously, and delete corresponding job in local js store 
  */

	_deleteJob: function(jobId) {
		let setting=_config.setting;
		let jobPromise=Q(axios.get('/job/' + jobId + '/delete', {
			headers: {'X-Requested-With': 'XMLHttpRequest'},
		}))
		.then(function(res) {
			if (res.data.error) {
				console.log(res.data.error);
				return;
			} else {
				_.remove(this.state.joblist, {job_id: jobId});
				this._removeJob(jobId);
				return jobId;
			}
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		});
		return jobPromise;
	},

	deleteJobs: function(jobIds) {
		let promises=jobIds.map(function(jobId) {
			return this._deleteJob(jobId);
		}.bind(this));
		Q.allSettled(promises)
		.then(function(results) {
			this.complete();
		}.bind(this));
	},

  /*
  ### Description
  Call web api to submit all workflow jobs asynchronously, and return workflow and its jobs json, also adjust the workflow and its jobs in local js store
  */
	submitWorkflowJobs: function(wf, formData) {
		let submitNumber=this.state.jobs.length;
		let setting=_config.setting;
    wf.workflow_id=formData.get('_workflow_id');
    wf.name=formData.get('workflow_name');
		wf.steps.map(function(step, i) {
			this.state.jobs[submitNumber + i]={appId: step.appId};
      delete step.jobId;
		}.bind(this));
		this.state.workflow={};
		WorkflowActions.setWorkflow(wf.workflow_id, wf, undefined, undefined, true);
		this.complete();
		Q(axios.post('/workflowJob/new', formData, {
			headers: {'X-Requested-With': 'XMLHttpRequest'},
			transformRequest: function(data) { return data; }
		}))
		.then(function(res) {
			if (res.data.error) {
				wf.steps.map(function(step, i) {
					this.state.jobs[submitNumber + i].job_id=0;
				}.bind(this));
				console.log(res.data.error);
			} else {
				let data=res.data.data;
				//let jobs=[];
				wf.steps.map(function(step, i) {
					let job=data.jobs[i];
					this._setJobData(job, submitNumber + i, -1);
					//jobs[i]=job.job_id;
				}.bind(this));
				this.state.workflow={
					id: data.workflow_id,
					workflowDetail: data.workflow
					//jobs: jobs,
					//steps: []
				};
				//WorkflowActions.setWorkflow(data.workflow_id, data.workflow, true, true);
				WorkflowActions.setWorkflow(data.workflow_id, data.workflow, true);
				this.complete();
				Q(axios.get('/workflowJob/run/' + data.workflow_id, {
					headers: {'X-Requested-With': 'XMLHttpRequest'}
				}))
				.then(function(res) {
					if (res.data.error) {
						console.log(res.data.error);
						return;
					}
				}.bind(this));
			}
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		})
		.done();
	},

  /*
  ### Description
  call web api to submit job asynchronously, and return job json, also adjust job in local js store
  */
	submitJob: function(appId, formData) {
		let submitNumber=this.state.jobs.length;
		let setting=_config.setting;
		this.state.jobs[submitNumber]={appId: appId};
		this.complete();
		Q(axios.post('/job/new/' + appId , formData, {
			headers: {'X-Requested-With': 'XMLHttpRequest'},
			transformRequest: function(data) { return data; }
		}))
		.then(function(res) {
			if (res.data.error) {
				this.state.jobs[submitNumber].job_id=0;
				console.log(error);
			} else {
				let job=res.data.data;
				this._setJobData(job, submitNumber, -1);
			//} else {
				//this.state.jobs[submitNumber].job_id=undefined;
				//this.state.jobs[submitNumber].job_id=0;
			}
			this.complete();
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		})
		.done();
	},

  /*
  ### Description
  call _setJobs to submit all jobs asynchronously, and return it as promise, also adjust job in local js store
  */
	setJobs: function(jobIds, check, noJobList) {
		if (! jobIds) {
			jobIds=_.filter(this.state.jobs, function(job) {
				return job.status && !_.includes(['FINISHED','FAILED'], job.status)
			})
			.map(job => job.job_id);
		}
		let funcs=jobIds.map(function(jobId) {
			return function() {
				return this._setJob(jobId, check, noJobList).then(function(job) {
					return job;
				}.bind(this));
			}.bind(this);
		}.bind(this));

		return funcs.reduce(Q.when, Q(1)).then(function() {
			if (jobIds.length) {
				this.complete();
			}
		}.bind(this));
	},

  /*
  ### Description
  reset the wokflow in local js store
  */
	resetWorkflowJobs: function(wid) {
		delete this.state.wid[wid];
	},

  /*
  ### Description
  test whether job changed or not, when compared with job stored in cache
  */
	isChanged: function(data) {
		let job_id=data.job_id;
		let old_data=this.state.jobDetailCache[job_id];
		return ! old_data || old_data.id === undefined && data.id || old_data.status !== data.status;
	},

  /*
  ### Description
  call _setJob to submit job asynchronously, and return it as promise, also adjust job in local js store
  */
	setJob: function(jobId, check, noJobList) {
		let jobPromise=this._setJob(jobId, check, noJobList)
		.then(function(job) {
			this.complete();
		}.bind(this));
		return jobPromise;
	},

  /*
  ### Description
  Adjust job in local js store
  */
	_setJobData: function(data, i, j) {
		let job_id=data.job_id;
		this.state.jobDetailCache[job_id]=data;
		let jobListData=_.pick(data, ['job_id', 'appId', 'status', 'remoteSubmitted', 'remoteEnded']);
		jobListData.app_id=jobListData.appId;
    if (i === undefined) {
    } else if (i >= 0) {
			this.state.jobs[i]=jobListData
		} else {
			this.state.jobs.push(jobListData);
		}
    if (j === undefined) {
    } else if (j >= 0) {
			this.state.joblist[j]=jobListData;
		} else {
			this.state.joblist.unshift(jobListData);
		}
	},

  /*
  ### Description
  call web api to submit job asynchronously, and return it as promise, also adjust job in local js store
  It first check local cache to varify whether the web call is needed. 
  If check is true, it asks the web service to check local database only
  if noJoblist is true, the history panel job list will not be updated
  */
	_setJob: function(jobId, check, noJobList) {
		let jobDetail=this.state.jobDetailCache[jobId];
    let job=_.find(this.state.joblist, 'job_id', jobId);
    let from_joblist=false;
    if (! jobDetail && job && job.agave_json) {
      try {
        jobDetail=JSON.parse(job.agave_json);
        from_joblist=true;
      } catch(err) {
      };
    }
		let setting=_config.setting;
		let jobPromise;
		if (jobDetail && _.includes(['FINISHED','FAILED'], jobDetail.status)) {
			jobPromise=Q(jobDetail);
		} else {
			let param=check ? '?check=1' : ''
			jobPromise=Q(axios.get('/job/' + jobId + param, {
				headers: {'X-Requested-With': 'XMLHttpRequest'},
			}))
			.then(function(res) {
				if (res.data.error) {
					console.log(res.data.error);
					return;
				} else {
					let data=res.data.data;
					return data;
				}
			}.bind(this))
			.catch(function(error) {
				console.log(error);
			});
    }
    return jobPromise.then(function(data) {
			if (data.appId) {
				AppsActions.setApp(data.appId);
			}
      let i=_.findIndex(this.state.jobs, 'job_id', data.job_id);
      let j=_.findIndex(this.state.joblist, 'job_id', data.job_id);
      if (this.isChanged(data) || ! noJobList && (i < 0 || j < 0)) {
        if (noJobList) {
          i=undefined;
        }
        this._setJobData(data, i, j);
        if ('FINISHED' === data.status) {
          this.setJobOutputs(data.job_id, true);
        }
      }
      if (from_joblist === true && ! _.includes(['FINISHED','FAILED'], data.status)) {
        this.setJob(data.job_id, check, noJobList);
      }
      return data;
    }.bind(this));
	},

  /*
  ### Description
  Remove job from history panel job list
  */
	_removeJob: function(jobId) {
		_.remove(this.state.jobs, {job_id: jobId});
	},

  /*
  ### Description
  call web api to save job asynchronously
  */
	saveJobs: function() {
		let jobIds=this.state.jobs.map(function(job) {
			return job.job_id;
		});
		Q(axios.get('/job/save/' + jobIds.join(','), {
			headers: {'X-Requested-With': 'XMLHttpRequest'},
		}))
		.then(function(res) {
			if (res.data.error) {
				console.log(res.data.error);
				return;
			} else {
				return res.data;
			}
		})
		.catch(function(error) {
			console.log(error);
		})
		.done();
	},

  /*
  ### Description
  setting job data and showing in job detail modal
  */
	showJob: function(jobId) {
		if (! this.state.showJob) {
			this.state.showJob=true;
			this.complete();
			if (jobId) {
				let jobPromise=this._setJob(jobId);
				jobPromise.then(function(jobDetail) {
					this.state.showJobId=jobId;
					this.complete();
				}.bind(this))
				.catch(function(error) {
					console.log(error);
				})
				.done();
			}
		}
	},

  /*
  ### Description
  hiding job detail modal, unset the job id for showing
  */
	hideJob: function() {
		if (this.state.showJob) {
			this.state.showJobId=undefined;
			this.state.showJob=false;
			this.complete();
		}
	},

  /*
  ### Description
  call _setWorkflowJobOutputs to retrieve outputs of all jobs in workflow asynchronously
  */
	setWorkflowJobOutputs: function(wid) {
		let jobIds=this.state.workflowBuilderJobIndex.map(function(v, i) {
			return v ? this.state.jobs[i].job_id : undefined;
		}.bind(this)).filter(function(v) {return v !== undefined});

		let funcs=jobIds.map(function(jobId) {
			return function() {
				return this._setJobOutputs(jobId).then(function(jobOutputs) {
					return jobOutputs;
				}.bind(this));
			}.bind(this);
		}.bind(this));

		funcs.reduce(Q.when, Q(1)).then(function() {
			if (wid !== undefined) {
				this.state.wid[wid]=true;
				WorkflowActions.workflowJobsReady(wid, jobIds, this.state.jobDetailCache, this.state.jobOutputs);
			}
			this.complete();
		}.bind(this));
	},

  /*
  ### Description
  call web api to retrieve job outputs data asynchronously and return it as promise
  */
	_setJobOutputs: function(jobId, jobIsCached) {
		let jobOutputs=this.state.jobOutputs[jobId];
		let setting=_config.setting;
		let jobOutputsPromise;
		if (jobOutputs && jobOutputs.length) {
			jobOutputsPromise=Q(jobOutputs);
		} else {
			let jobDetail=this.state.jobDetailCache[jobId];
			let jobPromise=jobIsCached && jobDetail ? Q(jobDetail) : this._setJob(jobId);
			jobOutputsPromise=jobPromise.then(function(jobDetail) {
				if ('FINISHED' === jobDetail.status && jobDetail.archivePath) {
					//let path='__system__/' + jobDetail.archiveSystem + '/' + jobDetail.archivePath;
					let path='__home__/' + jobDetail.archivePath + '/?nopath=1';
					return Q(axios.get('/browse/' + path, {
						headers: {'X-Requested-With': 'XMLHttpRequest'},
					}))
				}
				return Q(0);
			})
			.then(function(res) {
				if (! res) {
					return;
				} else if (res.data.error) {
					console.log(res.data.error);
					return;
				} else {
					let data=res.data.data;
					let results=[];
					try {
						results=data[0].list.filter(function(result) {
							return ! result.name.startsWith('.');
						});
					} catch(err) {
					} finally {
					};
					for (let r of results) {
						r.path=r.path.replace(setting.archive_home + '/', '');
					}
					return results;
				}
			})
			.then(function(results) {
				if (results) {
					this.state.jobOutputs[jobId]=results;
					return results;
				} else {
					return;
				}
			}.bind(this))
			.catch(function(error) {
				console.log(error);
			});
		}
		return jobOutputsPromise;
	},

  /*
  ### Description
  call _setWorkflowJobOutputs to retrieve outputs of jobs asynchronously
  */
	setJobOutputs: function(jobId, jobIsCached) {
		let jobOutputsPromise=this._setJobOutputs(jobId, jobIsCached);
		jobOutputsPromise.then(function() {
			this.complete();
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		})
		.done();
	},

	stageJobOutputs: function(jobId) {
		let setting=_config.setting;
		if (! this.state.jobOutputsStaged[jobId]) {
			let file_types=setting.stage_file_types;
			let outputs=this.state.jobOutputs[jobId];
			let stage_list=outputs.filter(function(op) {
				return _.some(file_types, function(ft) {
					return _.endsWith(op.name.toLowerCase(), ft.toLowerCase());
				});
			});

			let stagePromise=Q(axios.get('/job/' + jobId + '/stageJobOutputs?stage=' + stage_list.length, {
				headers: {'X-Requested-With': 'XMLHttpRequest'},
			}))
			.then(function(res) {
				if (res.data.error) {
					console.log(res.data.error);
					return;
				} else {
					let data=res.data.data;
					//this.state.jobOutputsStaged[jobId]=data.target;
					return data.target;
				}
			}.bind(this))
			.catch(function(error) {
				console.log(error);
			});
			this.state.jobOutputsStaged[jobId]=stagePromise;
		}
		this.complete();
		return this.state.jobOutputsStaged[jobId];
	},

	setFile: function(fileId, path) {
		let setting=_config.setting;
		//let path=url.replace('^(agave|https?)://', '');
		let fileDetail=this.state.fileDetailCache[fileId];
		let filePromise;
		if (fileDetail) {
			filePromise=Q(fileDetail);
		} else {
			filePromise=Q(axios.get('/file/' + path, {
				headers: {'X-Requested-With': 'XMLHttpRequest'},
			}))
			.then(function(res) {
				return res.data;
			}.bind(this))
		}
		filePromise.then(function(data) {
			if (! fileDetail && data.system) {
				this.state.fileDetailCache[fileId]=data;
			}
			return data;
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		});
		return filePromise;
	},

  /*
  ### Description
  call web api to check the status of all jobs in a workflow asynchronously
  */
	checkWorkflowJobStatus: function(wfId) {
		let setting=_config.setting;
		let jobStatusPromise=Q(axios.get('/workflow/' + wfId + '/jobStatus', {
			headers: {'X-Requested-With': 'XMLHttpRequest'},
		}))
		.then(function(res) {
			let changed;
			if (res.data.error) {
				console.log(res.data.error);
				return;
			} else {
				_.forEach(res.data.data, function(data) {
					if (this.isChanged(data)) {
						changed=true;
						let i=_.findIndex(this.state.jobs, 'job_id', data.job_id);
						let j=_.findIndex(this.state.joblist, 'job_id', data.job_id);
						this._setJobData(data, i, j);
					}
				}.bind(this));
			}
			//if (changed) {
			//	WorkflowActions.updateWorkflowJob(wfId, res.data.data);
			//}
			this.complete();
			return res.data.data;
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		});
		return jobStatusPromise;
	},

	resubmitJob: function(jobId) {
		let jobPromise=this._setJob(jobId);
		jobPromise.then(function(jobDetail) {
			AppsActions.showAppByJob(jobDetail);
		}.bind(this))
		.catch(function(error) {
			console.log(error);
		})
		.done();
	},

  /*
  ### Description
  Add job to job index list used by workflow builder and call setJobs to retrieve jobs
  */
	addWorkflowBuilderJobIndex: function(index) {
		let jobIds=[];
		this.state.jobs.forEach(function(job, i) {
			if (undefined === index || index === i) {
				let job=this.state.jobs[i];
				//if (job.job_id && this.state.jobOutputs[job.job_id] && this.state.jobOutputs[job.job_id].length > 0) {
					//this.state.workflowBuilderJobIndex[i]=true;
				//}
				this.state.workflowBuilderJobIndex[i]=true;
				jobIds.push(job.job_id);
			}
		}.bind(this));
		if (jobIds.length >= 0) {
			this.setJobs(jobIds);
			this.complete();
		}
	},

  /*
  ### Description
  Remove job from job index list
  */
	removeWorkflowBuilderJobIndex: function(index) {
		if (index !== undefined) {
			delete this.state.workflowBuilderJobIndex[index];
		} else {
			this.state.workflowBuilderJobIndex=[];
		}
		this.complete();
	}
});

module.exports = JobsStore;
