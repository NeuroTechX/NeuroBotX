# NeuroBotX

This repository is an App for Slack intended to be hosted on [Beep Boop][bb].  It's written in [node.js](), uses the [Slapp][slapp] library, and takes advantage of the [Slack Events API][slack-events-api].

## Setup Instructions

Once you've created a new [Beep Boop](bb) project with this repo, go to your project's **Settings** tab and enable a Slack App.

![Enable Slack App](https://cloud.githubusercontent.com/assets/367275/19362140/b4039c86-9142-11e6-9b31-941609c1b090.gif)

Follow the steps laid out in the wizard. You'll want to enable **Event Subscriptions** on your Slack App using the `URL` provided and add subscriptions for the following **Bot Events**:

+ `im_open`
+ `im_close`
+ `message.channels`
+ `message.im`
+ `team_join`

### 🔥 it up

Once you've finished setting up your Slack App and saved the `Client ID`, `Client Secret` and `Verification Token` on Beep Boop, go ahead and **Start** your project.

![Start](https://cloud.githubusercontent.com/assets/367275/19364564/edb43efa-914b-11e6-9265-d33122bf5f9a.png)

Once your project has started, go to the **Teams** tab and add your new Slack App to one of your Slack teams.

![Add Team](https://cloud.githubusercontent.com/assets/367275/19364343/012e4922-914b-11e6-8f0a-bb020b016fd2.png)

## Usage

| Command       | Arg 0    | Arg 1 | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|---------------|----------|-------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| /github       | [Token]  |       | Initialize the github authentication token.<br />**token**: The Github Oauth user token<br />                                                                                                                                                                                                                                                                                                                                                                              |
| /stats        | [Option] | [VAL] | Keywords usage statistics.<br /> **print**: prints the current statistics.<br /> **reset**: resets the current statistics.<br />**add [VAL]** adds [VAL] to the tracked keywords list.<br /> **delete [VAL]** deletes [VAL] from the tracked keywords list.<br /> **start** starts statistics tracking.(Github token must be initialized first using /github)<br /> **stop** stops statistics tracking.<br />**subscribe** subscribe to the weekly statistics message.<br /> **unsubscribe** unsubscribe from the weekly statistics message. |
| /links        | [Option] | [VAL] | Links tracking.<br /> **print** prints the current links buffer waiting to be pushed to Wordpress.<br /> **start** starts links tracking.<br /> **stop** stops links tracking.                                                                                                                                                                                                                                                                                                    |
| /archivetogit | [Option] |       | Archive messages to github.<br /> **start** starts the archiving to git. (Github token must be initialized first using /github)<br /> **stop** stops the archiving to git.                                                                                                                                                                                                                                                                                                 |

[bb]: https://beepboophq.com
[slapp]: https://github.com/BeepBoopHQ/slapp
[slack-events-api]: https://api.slack.com/events-api
[presence-polyfill]: https://github.com/BeepBoopHQ/beepboop-slapp-presence-polyfill
