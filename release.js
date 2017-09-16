const https = require('https');
const token = process.env.DIGITAL_OCEAN_TOKEN;
const floatingIp = process.env.FLOATING_IP;

const args = process.argv.slice(2);
const clusterId = args[0];

assignFloatingIpToClusterTask(() => {
  setTimeout(purgeTask, 5000);
});

function assignFloatingIpToClusterTask(fn) {
  log('TASK Assign Floating Ip To Cluster');
  getDropletIdByName(`${clusterId}-master-1`, id => {
    assignFloatingIp(id, fn);
  });
}

function getDropletIdByName(name, fn) {
  getDroplets(droplets => {
    const droplet = droplets.find(d => d.name === name);
    if (droplet) {
      log(`Droplet ${name} has ID: ${droplet.id}`);
      fn(droplet.id);
    } else {
      log(`Droplet ${name} was not found`);
    }
  });
}

function assignFloatingIp(dropletId, fn) {
  const path = `/v2/floating_ips/${floatingIp}/actions`;
  const method = 'POST';
  const data = `{"type":"assign","droplet_id":"${dropletId}"}`;
  doRequest({ path, method, data }, (body, status) => {
    const message = `assign floating IP ${floatingIp} to droplet with ID: ${dropletId}`;
    log(status === 201 ? `Successfully ${message}` : `Fail to ${message}`);
    fn();
  });
}

function purgeTask() {
  log('TASK Purge');
  getClusterDropletsWithNoFloatingIp(ds => deleteDroplets(ds));
}

function getClusterDropletsWithNoFloatingIp(fn) {
  getDropletsWithFloatingIp(fds => {
    const clusterIds = fds.map(d => d.name.slice(0, d.name.indexOf('-')));
    log('Remain droplets for cluster: ', clusterIds);
    getDroplets(ds => fn(ds.filter(d => clusterIds.every(pref => d.name.indexOf(pref) === -1))));
  });
}

function getDropletsWithFloatingIp(fn) {
  const path = `/v2/floating_ips?page=1&per_page=1000`;
  const method = 'GET';
  doRequest({ path, method }, body => fn(body.floating_ips.map(ip => ip.droplet).filter(ip => ip)));
}

function getDroplets(fn) {
  const path = '/v2/droplets?page=1&per_page=1000';
  const method = 'GET';
  doRequest({ path, method }, body => fn(body.droplets));
}

function deleteDroplets(droplets) {
  droplets.forEach(d => {
    const name = `${d.name} with ID: ${d.id}`;
    log(`Deleting droplet ${name}`);
    const path = `/v2/droplets/${d.id}`;
    const method = 'DELETE';
    doRequest({ path, method }, (body, status) => {
      log(status === 204 ? `Droplet ${name} has been removed successuly` : `Droplet ${name} deletion failed`);
    })
  })
}

function doRequest({ path, method, data }, fn) {
  const options = {
    hostname: 'api.digitalocean.com',
    path: path,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      const status = res.statusCode;
      if (fn) fn(status !== 204 && status < 400 ? JSON.parse(body) : {}, status)
    });
  });

  req.on('error', (e) => console.error(e));
  if (data) req.write(data);

  req.end();
}

function log() {
  function write(m) {
    process.stdout.write(m);
  }

  const args = Array.prototype.slice.call(arguments);
  write('>>>>>> ');
  args.forEach(m => write(JSON.stringify(m) + ' '));
  write('\n')
}
