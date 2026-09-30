import { message } from '../message';

import { state } from '../state';
import { bookmark } from '../bookmark';
import { menu } from '../menu';
import { version } from '../version';
import { update } from '../update';
import { backgroundImageStorage } from '../backgroundImageStorage';
import { APP_NAME } from '../../constant';

import { Modal } from '../modal';
import { ImportForm } from '../importForm';

import { dateTime } from '../../utility/dateTime';
import { node } from '../../utility/node';
import { complexNode } from '../../utility/complexNode';
import { isJson } from '../../utility/isJson';
import { clearChildNode } from '../../utility/clearChildNode';

const data = {};

data.set = (key, data) => {
  window.localStorage.setItem(key, data);
};

data.get = (key) => {
  return window.localStorage.getItem(key);
};

data.import = {
  state: {
    setup: { include: true },
    bookmark: { include: true, type: 'restore' },
    theme: { include: true }
  },
  reset: () => {
    data.import.state.setup.include = true;

    data.import.state.bookmark.include = true;

    data.import.state.bookmark.type = 'restore';

    data.import.state.theme.include = true;
  },
  file: ({
    fileList = false,
    feedback = false,
    input = false
  } = {}) => {
    if (fileList.length > 0) {
      data.validate.file({
        fileList: fileList,
        feedback: feedback,
        input: input
      });
    }
  },
  drop: ({
    fileList = false,
    feedback = false
  }) => {
    if (fileList.length > 0) {
      data.validate.file({
        fileList: fileList,
        feedback: feedback
      });
    }
  },
  paste: ({
    clipboardData = false,
    feedback = false
  }) => {
    data.validate.paste({
      clipboardData: clipboardData,
      feedback: feedback
    });
  },
  render: (dataToImport) => {
    let dataToCheck = JSON.parse(dataToImport);

    if (dataToCheck.version !== version.number) {
      dataToCheck = data.update(dataToCheck);
    }

    const importForm = new ImportForm({
      dataToImport: dataToCheck,
      state: data.import.state
    });

    const importModal = new Modal({
      heading: message.get('dataRestoreHeading'),
      content: importForm.form(),
      successText: message.get('dataRestoreSuccessText'),
      cancelText: message.get('dataRestoreCancelText'),
      width: 'small',
      successAction: async () => {
        const restoreState = JSON.parse(JSON.stringify(data.import.state));

        if (restoreState.setup.include || restoreState.theme.include || restoreState.bookmark.include) {
          let dataToRestore = JSON.parse(dataToImport);

          if (dataToRestore.version !== version.number) {
            data.backup(dataToRestore);

            dataToRestore = data.update(dataToRestore);
          }

          if (restoreState.theme.include) {
            await backgroundImageStorage.prepare(dataToRestore);
          }

          data.restore(dataToRestore, restoreState);

          data.save();

          data.reload.render();
        }

        data.import.reset();
      },
      cancelAction: () => { data.import.reset(); },
      closeAction: () => { data.import.reset(); }
    });

    importModal.open();
  }
};

data.validate = {
  paste: ({
    feedback = false
  } = {}) => {
    navigator.clipboard.readText().then(clipboardData => {
      // is the data a JSON object
      if (isJson(clipboardData)) {
        // is this JSON from this app
        if (JSON.parse(clipboardData)[APP_NAME] || JSON.parse(clipboardData)[APP_NAME.toLowerCase()]) {
          data.feedback.clear.render(feedback);

          data.feedback.success.render(feedback, 'Clipboard data', () => {
            menu.close();

            data.import.render(clipboardData);
          });
        } else {
          data.feedback.clear.render(feedback);

          data.feedback.fail.notClipboardJson.render(feedback, 'Clipboard data');
        }
      } else {
        // not a JSON object

        data.feedback.clear.render(feedback);

        data.feedback.fail.notClipboardJson.render(feedback, 'Clipboard data');
      }
    }).catch(() => {
      data.feedback.clear.render(feedback);

      data.feedback.fail.notClipboardJson.render(feedback, 'Clipboard data');
    });
  },
  file: ({
    fileList = false,
    feedback = false,
    input = false
  } = {}) => {
    // make new file reader
    const reader = new window.FileReader();

    // define the on load event for the reader
    reader.onload = (event) => {
      // is this a JSON file
      if (isJson(event.target.result)) {
        // is this JSON from this app
        if (JSON.parse(event.target.result)[APP_NAME] || JSON.parse(event.target.result)[APP_NAME.toLowerCase()]) {
          data.feedback.clear.render(feedback);

          data.feedback.success.render(feedback, fileList[0].name, () => {
            menu.close();

            data.import.render(event.target.result);
          });

          if (input) { input.value = ''; }
        } else {
          data.feedback.clear.render(feedback);

          data.feedback.fail.notAppJson.render(feedback, fileList[0].name);

          if (input) { input.value = ''; }
        }
      } else {
        // not a JSON file

        data.feedback.clear.render(feedback);

        data.feedback.fail.notJson.render(feedback, fileList[0].name);

        if (input) {
          input.value = '';
        }
      }
    };

    // invoke the reader
    reader.readAsText(fileList.item(0));
  }
};

data.exportData = async () => backgroundImageStorage.hydrate(data.load(), { portable: true });

data.export = async () => {
  let timestamp = dateTime();

  const leadingZero = (value) => {
    if (value < 10) {
      value = '0' + value;
    }
    return value;
  };

  timestamp.hours = leadingZero(timestamp.hours);
  timestamp.minutes = leadingZero(timestamp.minutes);
  timestamp.seconds = leadingZero(timestamp.seconds);
  timestamp.date = leadingZero(timestamp.date);
  timestamp.month = leadingZero(timestamp.month + 1);
  timestamp.year = leadingZero(timestamp.year);
  timestamp = timestamp.year + '.' + timestamp.month + '.' + timestamp.date + ' - ' + timestamp.hours + ' ' + timestamp.minutes + ' ' + timestamp.seconds;

  const fileName = APP_NAME + ' ' + message.get('dataExportBackup') + ' - ' + timestamp + '.json';

  const dataToExport = URL.createObjectURL(new Blob([JSON.stringify(await data.exportData())], { type: 'application/json' }));

  const link = document.createElement('a');

  link.setAttribute('href', dataToExport);

  link.setAttribute('download', fileName);

  link.addEventListener('click', () => { link.remove(); });

  document.querySelector('body').appendChild(link);

  link.click();

  setTimeout(() => URL.revokeObjectURL(dataToExport), 1000);
};

data.remove = (key) => {
  window.localStorage.removeItem(key);
};

data.backup = (dataToBackup) => {
  if (dataToBackup) {
    data.set(APP_NAME + 'Backup', backgroundImageStorage.serialize(dataToBackup));

    console.log('data version ' + dataToBackup.version + ' backed up');
  }
};

data.update = (dataToUpdate) => {
  if (dataToUpdate.version !== version.number) {
    dataToUpdate = update.run(dataToUpdate);
  } else {
    console.log('data version:', version.number, 'no need to run update');
  }

  return dataToUpdate;
};

data.restore = (dataToRestore, restoreState = data.import.state) => {
  if (dataToRestore) {
    console.log('data found to load');

    if (restoreState.setup.include) {
      state.set.restore.setup(dataToRestore);
    }

    if (restoreState.theme.include) {
      state.set.restore.theme(dataToRestore);
    }

    if (restoreState.bookmark.include) {
      switch (restoreState.bookmark.type) {
        case 'restore':
          bookmark.restore(dataToRestore);
          break;

        case 'append':
          bookmark.append(dataToRestore);
          break;
      }
    }
  } else {
    console.log('no data found to load');

    state.set.default();
  }
};

data.releaseBackgroundImages = (previous, snapshot) => {
  let backup;

  try {
    backup = JSON.parse(data.get(APP_NAME + 'Backup'));
  } catch {
    // Retain images when an unreadable backup might still reference them.
    return Promise.resolve();
  }

  return backgroundImageStorage.releaseUnused(previous, snapshot, backup);
};

data.save = () => {
  const previous = data.load();
  const snapshot = {
    [APP_NAME]: true,
    version: version.number,
    state: state.get.current(),
    bookmark: bookmark.all
  };

  data.set(APP_NAME, backgroundImageStorage.serialize(snapshot));

  data.releaseBackgroundImages(previous, snapshot).catch(console.error);
};

data.load = () => {
  if (data.get(APP_NAME) !== null && data.get(APP_NAME) !== undefined) {
    let dataToLoad = JSON.parse(data.get(APP_NAME));

    if (dataToLoad.version !== version.number) {
      data.backup(dataToLoad);

      dataToLoad = data.update(dataToLoad);
    }

    return dataToLoad;
  } else {
    return false;
  }
};

data.wipe = {
  all: async () => {
    const previous = data.load();

    data.remove(APP_NAME);

    await data.releaseBackgroundImages(previous, null).catch(console.error);

    data.reload.render();
  },
  partial: async () => {
    const previous = data.load();

    bookmark.reset();

    data.set(APP_NAME, JSON.stringify({
      [APP_NAME]: true,
      version: version.number,
      state: state.get.default(),
      bookmark: bookmark.all
    }));

    await data.releaseBackgroundImages(previous, data.load()).catch(console.error);

    data.reload.render();
  }
};

data.reload = {
  render: () => {
    window.location.reload();
  }
};

data.clear = {
  all: {
    render: () => {
      const clearModal = new Modal({
        heading: message.get('dataClearAllHeading'),
        content: node('div', [
          node(`p:${message.get('dataClearAllContentPara1')}`),
          node(`p:${message.get('dataClearAllContentPara2')}`)
        ]),
        successText: message.get('dataClearAllSuccessText'),
        cancelText: message.get('dataClearAllCancelText'),
        width: 'small',
        successAction: () => {
          data.wipe.all();
        }
      });

      clearModal.open();
    }
  },
  partial: {
    render: () => {
      const clearModal = new Modal({
        heading: message.get('dataClearPartialHeading'),
        content: node('div', [
          node(`p:${message.get('dataClearPartialContentPara1')}`),
          node(`p:${message.get('dataClearPartialContentPara2')}`)
        ]),
        successText: message.get('dataClearPartialSuccessText'),
        cancelText: message.get('dataClearPartialCancelText'),
        width: 35,
        successAction: () => {
          data.wipe.partial();
        }
      });

      clearModal.open();
    }
  }
};

data.feedback = {};

data.feedback.empty = {
  render: (feedback) => {
    feedback.appendChild(node(`p:${message.get('dataFeedbackEmpty') || 'Text'}|class:muted small`));
  }
};

data.feedback.clear = {
  render: (feedback) => {
    clearChildNode(feedback);
  }
};

data.feedback.success = {
  render: (feedback, filename, action) => {
    feedback.appendChild(node(`p:${message.get('dataFeedbackSuccess')}|class:muted small`));

    feedback.appendChild(node('p:' + filename));

    if (action) {
      data.feedback.animation.set.render(feedback, 'is-pop', action);
    }
  }
};

data.feedback.fail = {
  notJson: {
    render: (feedback, filename) => {
      feedback.appendChild(node(`p:${message.get('dataFeedbackFailNotJson')}|class:small muted`));
      feedback.appendChild(complexNode({ tag: 'p', text: filename }));
      data.feedback.animation.set.render(feedback, 'is-shake');
    }
  },
  notAppJson: {
    render: (feedback, filename) => {
      feedback.appendChild(node(`p:${message.get('dataFeedbackFailNotAppJson')}|class:small muted`));
      feedback.appendChild(complexNode({ tag: 'p', text: filename }));
      data.feedback.animation.set.render(feedback, 'is-shake');
    }
  },
  notClipboardJson: {
    render: (feedback, name) => {
      feedback.appendChild(node(`p:${message.get('dataFeedbackFailNotClipboardJson')}|class:small muted`));
      feedback.appendChild(node('p:' + name));
      data.feedback.animation.set.render(feedback, 'is-shake');
    }
  }
};

data.feedback.animation = {
  set: {
    render: (feedback, animationClass, action) => {
      feedback.classList.add(animationClass);

      const animationEndAction = () => {
        if (action) {
          action();
        }
        data.feedback.animation.reset.render(feedback);
      };

      feedback.addEventListener('animationend', animationEndAction);
    }
  },
  reset: {
    render: (feedback) => {
      feedback.classList.remove('is-shake');
      feedback.classList.remove('is-pop');
      feedback.classList.remove('is-jello');
      feedback.removeEventListener('animationend', data.feedback.animation.reset.render);
    }
  }
};

data.init = async () => {
  const snapshot = data.load();

  try {
    await backgroundImageStorage.hydrate(snapshot);
  } catch (error) {
    console.error('Could not load uploaded background image', error);
  }

  data.restore(snapshot);
};

export { data };
