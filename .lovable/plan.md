# Fix résumé parsing on the published app

## Confirmed findings

- The deployed `parse-resume` service is online and successfully returns structured candidate data when called directly.
- The JavaScript currently served by `myeyedr.zenai.world` contains the latest résumé-upload implementation, including the `resumeText` path for Word documents.
- This rules out an offline parser and an obviously stale published bundle. The failure is specific to the published browser request path, session, file payload, or the way its error is handled.

## Fix plan

1. **Reproduce on the published domain while signed in**
   - Upload controlled PDF and DOCX résumés through the same screen the user uses.
   - Capture the published browser's request status, response message, console output, and the state of the form after parsing.
   - Compare that exact request with the working preview request rather than guessing at the cause.

2. **Repair the failing published path**
   - Fix whichever verified layer differs: authenticated function invocation, file conversion/payload, response normalization, or stale state in the upload form.
   - Keep the original résumé upload and all existing candidate fields intact.
   - Ensure both single-candidate and bulk upload use the same shared, corrected parser so they cannot drift again.

3. **Make failures visible and recoverable**
   - Preserve the real parser status/message and show it beside the affected file rather than silently leaving fields blank.
   - Add one bounded retry only for rate limits or temporary server failures; never retry invalid files or permission errors.
   - Prevent a partially parsed record from being added without clearly identifying which required fields still need attention.

4. **Verify end to end on the real site**
   - Test PDF and DOCX on `myeyedr.zenai.world`.
   - Confirm name, email, phone, address, role, employer, experience, summary, skills, work history, education, certifications, raw text, and original file all land correctly.
   - Add a test candidate to a requisition, confirm it appears in the correct pipeline, then remove the test record.
   - Run the existing type, test, and production-build checks, deploy the corrected function/app as needed, and repeat the published-domain test after deployment.

## Scope

This is an urgent focused repair. It will not alter candidate cards, pipeline design, scoring, interview transcription, or unrelated systems.
