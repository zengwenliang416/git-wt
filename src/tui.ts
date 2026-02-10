import blessed, { type Widgets } from 'blessed';

type WorkspaceInputs = {
  url: string;
  branch: string;
  dir: string;
};

type PartialInputs = Partial<WorkspaceInputs>;

type Focusable = {
  focus: () => void;
};

const createLabeledInput = (
  screen: Widgets.Screen,
  parent: Widgets.BoxElement,
  label: string,
  top: number,
  value: string,
): Widgets.TextboxElement => {
  blessed.text({
    parent,
    top,
    left: 2,
    width: 16,
    height: 1,
    content: label,
    style: {
      fg: 'cyan',
    },
  });

  const input = blessed.textbox({
    parent,
    inputOnFocus: true,
    mouse: true,
    keys: true,
    top,
    left: 20,
    right: 2,
    height: 3,
    border: 'line',
    value,
    style: {
      fg: 'white',
      border: { fg: 'gray' },
      focus: { border: { fg: 'green' } },
    },
  });

  input.on('focus', () => {
    screen.render();
  });

  return input;
};

const toInitialValue = (value: string | undefined): string => value?.trim() ?? '';

export const collectInputsWithTui = (initial: PartialInputs): Promise<WorkspaceInputs> =>
  new Promise((resolve, reject) => {
    const screen = blessed.screen({
      smartCSR: true,
      title: 'Git Easy WT',
      fullUnicode: true,
    });

    const root = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '90%',
      height: '90%',
      border: 'line',
      style: {
        border: { fg: 'blue' },
      },
    });

    blessed.box({
      parent: root,
      top: 1,
      left: 2,
      right: 2,
      height: 2,
      tags: true,
      content: '{bold}Git Easy Worktree TUI{/bold}  |  Fill values and press Enter to continue',
      style: {
        fg: 'white',
      },
    });

    const form = blessed.form({
      parent: root,
      top: 4,
      left: 1,
      right: 1,
      bottom: 4,
      keys: true,
      mouse: true,
    });

    const urlInput = createLabeledInput(screen, form, 'Repository URL', 0, toInitialValue(initial.url));
    const branchInput = createLabeledInput(screen, form, 'Branch', 4, toInitialValue(initial.branch));
    const dirInput = createLabeledInput(screen, form, 'Base Dir', 8, toInitialValue(initial.dir || process.cwd()));

    const message = blessed.box({
      parent: root,
      left: 2,
      right: 2,
      bottom: 2,
      height: 1,
      tags: true,
      content: '{gray-fg}Tab/Shift+Tab switch focus · Enter submit · Esc cancel{/gray-fg}',
    });

    const submitButton = blessed.button({
      parent: form,
      mouse: true,
      keys: true,
      shrink: true,
      top: 13,
      left: 20,
      padding: { left: 2, right: 2 },
      name: 'submit',
      content: 'Submit',
      style: {
        fg: 'black',
        bg: 'green',
        focus: { bg: 'white', fg: 'black' },
      },
    });

    const cancelButton = blessed.button({
      parent: form,
      mouse: true,
      keys: true,
      shrink: true,
      top: 13,
      left: 34,
      padding: { left: 2, right: 2 },
      name: 'cancel',
      content: 'Cancel',
      style: {
        fg: 'white',
        bg: 'red',
        focus: { bg: 'white', fg: 'black' },
      },
    });

    const focusables: Focusable[] = [urlInput, branchInput, dirInput, submitButton, cancelButton];
    let focusIndex = 0;
    let settled = false;

    const focusAt = (index: number): void => {
      const normalized = (index + focusables.length) % focusables.length;
      const target = focusables[normalized];
      if (!target) {
        return;
      }

      focusIndex = normalized;
      target.focus();
      screen.render();
    };

    const setError = (content: string): void => {
      message.setContent(`{red-fg}${content}{/red-fg}`);
      screen.render();
    };

    const cleanup = (): void => {
      screen.destroy();
    };

    const settle = (handler: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      handler();
    };

    const cancel = (): void => {
      settle(() => reject(new Error('Cancelled by user.')));
    };

    const submit = (): void => {
      const url = urlInput.getValue().trim();
      const branch = branchInput.getValue().trim();
      const dir = dirInput.getValue().trim();

      if (!url) {
        setError('Repository URL is required.');
        focusAt(0);
        return;
      }

      if (!branch) {
        setError('Branch is required.');
        focusAt(1);
        return;
      }

      if (!dir) {
        setError('Base directory is required.');
        focusAt(2);
        return;
      }

      settle(() => resolve({ url, branch, dir }));
    };

    screen.key(['tab'], () => focusAt(focusIndex + 1));
    screen.key(['S-tab'], () => focusAt(focusIndex - 1));
    screen.key(['escape', 'q', 'C-c'], cancel);
    screen.key(['C-s'], submit);

    urlInput.key('enter', () => focusAt(1));
    branchInput.key('enter', () => focusAt(2));
    dirInput.key('enter', submit);
    submitButton.on('press', submit);
    cancelButton.on('press', cancel);

    form.on('submit', submit);

    focusAt(0);
  });
