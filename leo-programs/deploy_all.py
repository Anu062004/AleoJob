#!/usr/bin/env python3
import pty, os, select, time, subprocess, sys

LEO = '/home/ankur/.cargo/bin/leo'
NETWORK = 'testnet'
ENDPOINT = 'https://api.explorer.provable.com/v1'

PROGRAMS = [
    '/mnt/c/Users/ankur/OneDrive/Desktop/AleoAleo/leo-programs/access_control',
    '/mnt/c/Users/ankur/OneDrive/Desktop/AleoAleo/leo-programs/reputation',
    '/mnt/c/Users/ankur/OneDrive/Desktop/AleoAleo/leo-programs/job_registry',
    '/mnt/c/Users/ankur/OneDrive/Desktop/AleoAleo/leo-programs/escrow',
]

PROMPT_TRIGGERS = [
    b'(y/n)',
    b'Would you like to proceed?',
    b'Do you want to proceed',
    b'(yes/no)',
]

def deploy(program_path):
    name = os.path.basename(program_path)
    print(f'\n{"="*60}', flush=True)
    print(f'DEPLOYING: {name}', flush=True)
    print(f'{"="*60}', flush=True)

    master_fd, slave_fd = pty.openpty()

    proc = subprocess.Popen(
        [LEO, 'deploy', '--network', NETWORK, '--endpoint', ENDPOINT],
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        cwd=program_path,
        close_fds=True,
        preexec_fn=os.setsid,
    )
    os.close(slave_fd)

    buf = b''
    tx_id = None
    last_answer_time = 0

    while True:
        try:
            r, _, _ = select.select([master_fd], [], [], 3.0)
        except (select.error, ValueError):
            break

        if r:
            try:
                data = os.read(master_fd, 4096)
                if not data:
                    break
                buf += data
                text = data.decode('utf-8', errors='replace')
                sys.stdout.write(text)
                sys.stdout.flush()

                # Answer y to any known prompt, but throttle to once per second
                now = time.time()
                if now - last_answer_time > 1.0:
                    for trigger in PROMPT_TRIGGERS:
                        if trigger in buf:
                            time.sleep(0.5)
                            os.write(master_fd, b'y\r')
                            time.sleep(0.2)
                            os.write(master_fd, b'\n')
                            last_answer_time = time.time()
                            buf = b''
                            break

                # Look for TX ID in output
                for line in text.splitlines():
                    stripped = line.strip()
                    if stripped.startswith('at1') and len(stripped) > 50:
                        tx_id = stripped.split()[0] if ' ' in stripped else stripped

            except OSError:
                break
        else:
            if proc.poll() is not None:
                break

    # Drain remaining output
    try:
        while True:
            r, _, _ = select.select([master_fd], [], [], 1.0)
            if r:
                try:
                    data = os.read(master_fd, 4096)
                    if not data:
                        break
                    text = data.decode('utf-8', errors='replace')
                    sys.stdout.write(text)
                    sys.stdout.flush()
                    for line in text.splitlines():
                        stripped = line.strip()
                        if stripped.startswith('at1') and len(stripped) > 50:
                            tx_id = stripped.split()[0] if ' ' in stripped else stripped
                except OSError:
                    break
            else:
                break
    except Exception:
        pass

    proc.wait()
    try:
        os.close(master_fd)
    except OSError:
        pass

    status = f'✅ TX: {tx_id}' if tx_id else '⚠️  No TX ID captured — check output above'
    print(f'\n{name}: {status}\n', flush=True)
    return tx_id

results = {}
for prog in PROGRAMS:
    tx = deploy(prog)
    results[os.path.basename(prog)] = tx
    if tx:
        print(f'Waiting 8s before next deployment...', flush=True)
        time.sleep(8)

print('\n' + '='*60)
print('FINAL DEPLOYMENT SUMMARY')
print('='*60)
for prog, tx in results.items():
    print(f'  {prog}: {tx or "FAILED - check output"}')
