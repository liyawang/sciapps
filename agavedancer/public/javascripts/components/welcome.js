'use strict';

import React from 'react';

const Welcome=React.createClass({
	render: function() {
		return(
			<div className="welcome">
				<div className="section">
					<b>SciApps</b> is a web-based platform for building, executing, & sharing scientific applications (Apps) and workflows, powered by  a federated CyVerse system at Cold Spring Harbor Laboratory. 
					<br /><br />
					<center><img className="mylogo"src="sciapps.gif" hspace="10" align="middle" /></center>
					<br /><br />
					<br />
					<div>
						The SciApps platform is supported in part by National Science Foundation DBI-1265383 (the CyVerse project), IOS-1445025 (the MaizeCode project), and Cold Spring Harbor Laboratory. 
					</div>
					<br /><br />
					<div id="myimages">
                        			<a href="https://cyverse.org" target="_blank"><img className="mylogo" height="60" src="cyverse.gif" hspace="10" align="middle" /></a>
						&nbsp;&nbsp;&nbsp;&nbsp;
                        			<a href="https://nsf.gov" target="_blank"><img classNmae="mylogo" height="70" src="nsf.gif" hspace="10" align="middle" /></a>
                                                &nbsp;&nbsp;&nbsp;&nbsp;
                                                <a href="http://maizecode.org" target="_blank"><img classNmae="mylogo" height="70" src="maizecode.gif"  align="middle" /></a>
                        			&nbsp;&nbsp;&nbsp;&nbsp;
                                                <a href="https://www.cshl.edu" target="_blank"><img classNmae="mylogo" height="60" src="cshl.gif" hspace="10" align="middle" /></a>
					</div>
				</div>
			</div>
		)
	}
});

module.exports = Welcome;
