// CodeGradXlib4node
// Time-stamp: "2018-11-20 19:12:06 queinnec"

/** In order to operate the CodeGradXlib module within Nodejs as a
    command line, we need access to the file system. This module
    complements CodeGradXlib with additional methods that makes use
    of the underlying file system.
*/

const fs = require('fs');
const when = require('when');
const nodefn = require('when/node');
const CodeGradX = require('codegradxlib');

/** re-export the `CodeGradX` object */
module.exports = CodeGradX;

/** Display the log with `console.log` or in a file.
    Console.log is asynchronous while writing in a file is synchronous!

    @method show
    @param {Array[object]} items - supersede the log with items
    @param {string} filename - write in file rather than console.
    @returns {Log}
    @memberof {CodeGradX.Log#}

  */

CodeGradX.Log.prototype.show = function (items, filename) {
    // console.log is run later so take a copy of the log now to
    // avoid displaying a later version of the log.
    items = items || this.items.slice(0);
    for ( let item of items ) {
        if ( filename ) {
            fs.appendFileSync(filename, `${item}\n`);
        } else {
            /* eslint no-console: [0] */
            console.log(item);
        }
    }
    return this;
};

/** Promisify the reading of a file.
    Caution: Specific to Node.js!

        @param {string} filename - file to read
        @returns {Promise} yields file content in a Buffer

      */

CodeGradX.readFileContent = function (filename) {
    return nodefn.call(require('fs').readFile, filename, 'binary')
        .then(function (filecontent) {
            return when(new Buffer(filecontent, 'binary'));
        });
};

/** Upload a new description of a new ExercisesSet for the current
 * campaign. You need to be a teacher of this campaign.

      @param {string} filename - Yaml file
      @returns {Promise<ExercisesSet>} yields {ExercisesSet}

    NOTA: The present implementation depends on Node.js, it uses the
    `fs` module to read the file to send. It has to be rewritten if
    run in a browser.
 */

CodeGradX.Campaign.prototype.uploadExercisesSet = function (filename) {
    const state = CodeGradX.getCurrentState();
    const campaign = this;
    state.debug('uploadExercisesSet1', campaign);
    function processResponse (response) {
        //console.log(response);
        state.debug('uploadExercisesSet2', response);
        campaign.exercisesSet = new CodeGradX.ExercisesSet(response.entity);
        return when(campaign.exercisesSet);
    }      
    return CodeGradX.readFileContent(filename).then(function (content) {
        content += '\n';
        const basefilename = filename.replace(new RegExp("^.*/"), '');
        const headers = {
            'Accept': 'application/octet-stream',
            'Content-Type': 'text/plain',
            'Content-Disposition': ("inline; filename=" + basefilename)
        };
        if ( CodeGradX.isNode() ) {
            headers["Content-Length"] = content.length;
        }
        state.debug('uploadExercisesSet6', JSON.stringify(headers));
        return state.sendAXServer('x', {
            path: ('/exercisesset/yml2json/' + campaign.name),
            method: "POST",
            headers: headers,
            entity: content
        }).then(processResponse);
    });
};

/** Send the content of a file as the proposed solution to an Exercise.
    Returns a Job on which you may invoke the `getReport` method.
    This variant sends a file read from the local file system.

      @param {string} filename
      @returns {Promise<Job>} yields {Job}

    NOTA: The present implementation depends on Node.js, it uses the
    `fs` module to read the file to send. It has to be rewritten if
    run in a browser.

    */

CodeGradX.Exercise.prototype.sendFileAnswer = function (filename) {
  const exercise = this;
  const state = CodeGradX.getCurrentState();
  state.debug('sendFileAnswer1', filename);
  if ( ! exercise.safecookie ) {
    return when.reject("Non deployed exercise " + exercise.name);
  }
  function make_processResponse (content) {
    return function (response) {
      //console.log(response);
      state.debug('sendFileAnswer2', response);
      return CodeGradX.parsexml(response.entity).then(function (js) {
        //console.log(js);
        state.debug('sendFileAnswer3', js);
        js = js.fw4ex.jobSubmittedReport;
        exercise.uuid = js.exercise.$.exerciseid;
        const job = new CodeGradX.Job({
          exercise: exercise,
          content: content,
          responseXML: response.entity,
          response: js,
          personid: CodeGradX._str2num(js.person.$.personid),
          archived: CodeGradX._str2Date(js.job.$.archived),
          jobid:    js.job.$.jobid,
          pathdir:  js.$.location
        });
        return when(job);
      });
    };
  }
  return CodeGradX.readFileContent(filename).then(function (content) {
    const basefilename = filename.replace(new RegExp("^.*/"), '');
    const headers = {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": ("inline; filename=" + basefilename),
        "Accept": 'text/xml'
    };
    if ( CodeGradX.isNode() ) {
        headers["Content-Length"] = content.length;
    }
    return state.sendAXServer('a', {
      path: ('/exercise/' + exercise.safecookie + '/job'),
      method: "POST",
      headers: headers,
      entity: content
    }).then(make_processResponse(content));
  });
};

/** submit a new Exercise and return it as soon as submitted successfully.
    This variant sends a file from the local file system.

    @param {string} filename - tgz file containing the exercise
    @returns {Promise<Exercise>} yielding Exercise

    */

CodeGradX.User.prototype.submitNewExercise = function (filename) {
  const user = this;
  const state = CodeGradX.getCurrentState();
  state.debug('submitNewExercise1', filename, user);
  function processResponse (response) {
      //console.log(response);
      state.debug('submitNewExercise3', response);
      return CodeGradX.parsexml(response.entity).then(function (js) {
        //console.log(js);
        state.debug('submitNewExercise4', js);
        js = js.fw4ex.exerciseSubmittedReport;
        const exercise = new CodeGradX.Exercise({
          location: js.$.location,
          personid: CodeGradX._str2num(js.person.$.personid),
          exerciseid: js.exercise.$.exerciseid,
          XMLsubmission: response.entity
        });
        state.debug('submitNewExercise5', exercise.exerciseid);
        return when(exercise);
      });
  }
  return CodeGradX.readFileContent(filename)
        .then(function (content) {
            state.debug('submitNewExercise2', content.length);
            const basefilename = filename.replace(new RegExp("^.*/"), '');
            const headers = {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": ("inline; filename=" + basefilename),
                "Accept": 'text/xml'
            };
            if ( CodeGradX.isNode() ) {
                headers["Content-Length"] = content.length;
            }
            return state.sendSequentially('e', {
                path: '/exercises/',
                method: "POST",
                headers: headers,
                entity: content
            }).then(processResponse);
  });
};

/** Send a batch of files that is, multiple answers to be marked
    against an Exercise.

    @param {string} filename - the tgz holding all students' files
    @returns {Promise<Batch>} yielding a Batch.

    */

CodeGradX.Exercise.prototype.sendBatch = function (filename) {
  const exercise = this;
  const state = CodeGradX.getCurrentState();
  state.debug('sendBatch1', filename);
  if ( ! exercise.safecookie ) {
    return when.reject("Non deployed exercise " + exercise.name);
  }
  function processResponse  (response) {
      //console.log(response.entity);
      state.debug('sendBatch2', response);
      return CodeGradX.parsexml(response.entity).then(function (js) {
        //console.log(js);
        state.debug('sendBatch3', js);
        js = js.fw4ex.multiJobSubmittedReport;
        exercise.uuid = js.exercise.$.exerciseid;
        const batch = new CodeGradX.Batch({
          exercise: exercise,
          //content: content,  // Too heavy
          responseXML: response.entity,
          response: js,
          personid: CodeGradX._str2num(js.person.$.personid),
          archived: CodeGradX._str2Date(js.batch.$.archived),
          batchid:  js.batch.$.batchid,
          pathdir:  js.$.location,
          finishedjobs: 0
        });
        return when(batch);
      });
  }
  return CodeGradX.readFileContent(filename).then(function (content) {
    const basefilename = filename.replace(new RegExp("^.*/"), '');
    const headers = {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": ("inline; filename=" + basefilename),
        "Accept": 'text/xml'
    };
    if ( CodeGradX.isNode() ) {
        headers["Content-Length"] = content.length;
    }
    return state.sendAXServer('a', {
      path: ('/exercise/' + exercise.safecookie + '/batch'),
      method: "POST",
      headers: headers,
      entity: content
    }).then(processResponse);
  });
};

// end of codegradxlib4node.js
