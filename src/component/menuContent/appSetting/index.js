import { message } from '../../message';

import * as form from '../../form';

import { node } from '../../../utility/node';

import { APP_REPOSITORY_URL, UPSTREAM_REPOSITORY_URL } from '../../../constant';

import { Link } from '../../link';
import { Splash } from '../../splash';

const appSetting = {};

appSetting.app = (parent) => {

  appSetting.app.para1 = node(`p:${message.get('menuContentAppPara1') || 'Text'}`);

  appSetting.app.link1 = new Link({
    text: message.get('menuContentAppLink1'),
    href: UPSTREAM_REPOSITORY_URL,
    openNew: true
  });

  appSetting.app.para2 = node(`p:${message.get('menuContentAppPara2') || 'Text'}`);

  appSetting.app.link2 = new Link({
    text: message.get('menuContentAppLink2'),
    href: APP_REPOSITORY_URL,
    openNew: true
  });

  appSetting.app.link3 = new Link({
    text: message.get('menuContentAppLink3'),
    href: `${APP_REPOSITORY_URL}/blob/main/license`,
    openNew: true
  });

  const splash = new Splash();

  parent.appendChild(
    node('div', [
      splash.splash(),
      node('hr'),
      form.wrap({
        children: [
          appSetting.app.para1,
          form.indent({
            children: [
              node('p', [
                appSetting.app.link1.link()
              ])
            ]
          })
        ]
      }),
      form.wrap({
        children: [
          appSetting.app.para2,
          form.indent({
            children: [
              node('p', [
                appSetting.app.link2.link()
              ]),
              node('p', [
                appSetting.app.link3.link()
              ])
            ]
          })
        ]
      })
    ])
  );

};

export { appSetting };
