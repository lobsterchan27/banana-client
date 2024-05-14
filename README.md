# banana-client
wip
local pc webui client for use with corresponding whisperx server and llm

---TO-DO----

-chunk determination.
    runs pass over video using a scene change threshold with a minimum interval variable. creates an array containing timestamps of the overall activity level.using this along with the timestamped transcriptions we deduce how we want to trigger responses from the llm. 

-want to output the video in different languages