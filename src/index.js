var cluster = require("cluster")
var context = require("../configure.json")
var fs = require("fs")
var logger = require("./context").mainlogger


function getKeyCount(obj){
	var n=0;
	for(var k in obj)
		n++;
	return n;
}

cluster.setupMaster({
	exec:"startAnalysers.js",
	args:[],
	silent: false
})


var conf = context.control;
cluster.on("exit",function(worker,code,signal){
	if(getKeyCount(cluster.workers)<conf.processCount){
		logger.warn('worker %d died (%s). restarting...',
		worker.process.pid, signal || code);
		cluster.fork();
	}else{
		logger.warn('worker %d died (%s)',worker.process.pid,signal || code)
	}
})

for(var i=0;i<context.control.processCount;i++){
	cluster.fork()
}


function monitor(){
	try{
		var content = fs.readFileSync("../configure.json",{encoding:"utf8"})
		conf = JSON.parse(content).control;
	}
	catch(err){
		logger.error("master monitor config file err %s",err.stack)
	}
	var workerCount = getKeyCount(cluster.workers)
	if(conf.processCount>workerCount){
		for(var i=0;i<(conf.processCount-workerCount);i++)
			cluster.fork()
	}else
	if(conf.processCount<workerCount){
		var delCount = workerCount - conf.processCount;
		var n =0;
		for(var id in cluster.workers){
			cluster.workers[id].kill()
			if(++n>=delCount)
				break;
		}
	}
	setTimeout(monitor,5000)
}

setTimeout(monitor,5000)
