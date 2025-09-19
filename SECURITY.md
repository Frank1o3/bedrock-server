# Security Policy

## Supported Versions

The following table outlines which versions of *bedrock-server* are currently supported with security updates:

| Version   | Supported                     |
|------------|-------------------------------|
| `main`     | ✅ Actively supported         |
| v1.0.x     | ✅ Bug fixes & security patches|
| v0.9.x     | ⚠️ Security patches only       |
| < v0.9     | ❌ Not supported               |

---

## Reporting a Vulnerability

If you believe you have discovered a security vulnerability in *bedrock-server*, please follow the steps below:

1. **Contact the Maintainer Privately**  
   Send an email to `jahdy1o3@gmail.com` (or whatever address you prefer) with the subject line:  
   > `[Security] bedrock-server – <Short Vulnerability Summary>`

2. **Information to Include**  
   Please include in your report:  
   - The version of *bedrock-server* in which you discovered the issue.  
   - A clear description of the vulnerability (what it is, impact, potential exploit).  
   - Steps to reproduce it (if possible).  
   - Any suggested fixes or workarounds.

3. **Acknowledgement & Timeline**  
   - We will respond within **7 calendar days** to confirm receipt of your report.  
   - If deemed valid, we aim to release a patch within **14 days**, unless more time is required due to complexity.  
   - You will be informed about the progress: whether the vulnerability is accepted, under review, or declined (with reasoning).

4. **Disclosure Policy**  
   - We ask that you **disclose responsibly**, meaning you allow the maintainers until the fix or mitigation is available before public disclosure.  
   - After the fix is released, you are free to disclose the vulnerability, provided you coordinate timing or reference with us.

---

## How We Process Security Reports

| Stage           | What Happens                                           |
|------------------|--------------------------------------------------------|
| Report Received  | We verify receipt, assess severity & reproducibility. |
| Triage           | We decide if it's a valid; decide severity.           |
| Development      | Fix/patch is created, tested, & reviewed.             |
| Release          | A patched version is released; release notes include security fix. |
| Post-Release     | Monitor if there are regressions or exploit reports.   |

---

## Security Best Practices

To keep your deployments safer, we recommend:

- Keep dependencies up to date.  
- Do not expose sensitive files (like `.env`) in public builds.  
- Use secure credentials for any access (passwords, SSH keys, API tokens).  
- Limit external access (network, permissions).  
- Run your server with least-privileged user where possible.

---

## Contact & Support

If you have any questions or need guidance beyond reporting a vulnerability, you can reach out to:

- Maintainer: *Frank1o3*  
- Email: `jahdy1o3@gmail.com`  
- GitHub Issues: (use only after private disclosure if needed)  

---

